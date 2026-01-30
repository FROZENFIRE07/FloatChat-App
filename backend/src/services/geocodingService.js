/**
 * Geocoding Service
 * 
 * Resolves landmarks (cities, ports, regions) to coordinates using OpenStreetMap Nominatim.
 * Implements lazy-loading cache to minimize API calls.
 * 
 * Design:
 * - First request hits Nominatim API
 * - Result is cached in memory AND file
 * - Next 1000+ requests are instant
 * 
 * Rate Limiting: Nominatim allows 1 req/sec for free
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'FloatChat/1.0 (oceanography-research-tool)';
const RATE_LIMIT_MS = 1100; // 1.1 seconds to be safe
const CACHE_FILE = path.join(__dirname, '../../data/geocache.json');

class GeocodingService {
    constructor() {
        this.cache = {};
        this.lastRequestTime = 0;
        this.initialized = false;
    }

    /**
     * Initialize service - load cache from file
     */
    async init() {
        if (this.initialized) return;

        try {
            if (fs.existsSync(CACHE_FILE)) {
                const rawData = fs.readFileSync(CACHE_FILE, 'utf8');
                this.cache = JSON.parse(rawData);
                console.log(`[GeocodingService] Loaded ${Object.keys(this.cache).length} cached landmarks`);
            } else {
                // Create empty cache file
                this._saveCache();
                console.log('[GeocodingService] Created new cache file');
            }
            this.initialized = true;
        } catch (error) {
            console.error('[GeocodingService] Failed to load cache:', error.message);
            this.cache = {};
            this.initialized = true;
        }
    }

    /**
     * Normalize query string for cache lookup
     * "Mumbai, India" → "mumbai india"
     */
    _normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/[,.-]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\s/g, '_');
    }

    /**
     * Save cache to file
     */
    _saveCache() {
        try {
            const dir = path.dirname(CACHE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
        } catch (error) {
            console.error('[GeocodingService] Failed to save cache:', error.message);
        }
    }

    /**
     * Enforce rate limiting
     */
    async _waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < RATE_LIMIT_MS) {
            const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Calculate centroid from bounding box
     * @param {Array} bbox - [south, north, west, east] or [minLat, maxLat, minLon, maxLon]
     */
    getCentroid(bbox) {
        if (!bbox || bbox.length !== 4) return null;

        // Nominatim returns [south, north, west, east] = [latMin, latMax, lonMin, lonMax]
        const [latMin, latMax, lonMin, lonMax] = bbox;
        return {
            lat: (parseFloat(latMin) + parseFloat(latMax)) / 2,
            lon: (parseFloat(lonMin) + parseFloat(lonMax)) / 2
        };
    }

    /**
     * Resolve a landmark to coordinates
     * @param {string} query - Landmark name (e.g., "Mumbai", "Port of Singapore")
     * @returns {Object|null} { lat, lon, bbox, displayName, source } or null if not found
     */
    async resolveLandmark(query) {
        if (!this.initialized) await this.init();

        const normalizedQuery = this._normalizeQuery(query);

        // Step 1: Check in-memory cache
        if (this.cache[normalizedQuery]) {
            console.log(`[GeocodingService] Cache hit for "${query}"`);
            return this.cache[normalizedQuery];
        }

        // Step 2: Call Nominatim API
        console.log(`[GeocodingService] Cache miss for "${query}", calling Nominatim...`);

        try {
            await this._waitForRateLimit();

            const response = await axios.get(NOMINATIM_BASE_URL, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': USER_AGENT
                },
                timeout: 10000
            });

            const results = response.data;

            if (!results || results.length === 0) {
                console.warn(`[GeocodingService] No results for "${query}"`);
                return null;
            }

            // Pick the best result (first one for now, could add logic for disambiguation)
            const best = this._selectBestResult(results, query);

            if (!best) return null;

            // Parse bounding box - Nominatim format: [south, north, west, east]
            const bbox = best.boundingbox ? best.boundingbox.map(Number) : null;
            const centroid = this.getCentroid(bbox);

            const result = {
                lat: centroid ? centroid.lat : parseFloat(best.lat),
                lon: centroid ? centroid.lon : parseFloat(best.lon),
                bbox: bbox ? {
                    latMin: bbox[0],
                    latMax: bbox[1],
                    lonMin: bbox[2],
                    lonMax: bbox[3]
                } : null,
                displayName: best.display_name,
                type: best.type,
                class: best.class,
                source: 'nominatim',
                resolvedAt: new Date().toISOString()
            };

            // Step 3: Save to cache
            this.cache[normalizedQuery] = result;
            this._saveCache();

            console.log(`[GeocodingService] Resolved "${query}" → lat: ${result.lat}, lon: ${result.lon}`);
            return result;

        } catch (error) {
            console.error(`[GeocodingService] Nominatim error for "${query}":`, error.message);
            return null;
        }
    }

    /**
     * Select the best result from multiple Nominatim results
     * Prefers: cities > municipalities > places > other
     */
    _selectBestResult(results, originalQuery) {
        if (!results || results.length === 0) return null;

        const queryLower = originalQuery.toLowerCase();

        // Preference order for result types
        const typePreference = [
            'city', 'town', 'municipality', 'administrative',
            'port', 'harbour', 'bay', 'sea', 'ocean',
            'village', 'suburb', 'place'
        ];

        // First, look for exact name match
        for (const result of results) {
            const displayLower = result.display_name.toLowerCase();
            if (displayLower.startsWith(queryLower)) {
                return result;
            }
        }

        // Second, prefer by type
        for (const preferredType of typePreference) {
            const match = results.find(r => r.type === preferredType);
            if (match) return match;
        }

        // Fallback: first result
        return results[0];
    }

    /**
     * Check if a query is potentially ambiguous
     * @param {string} query - The search query
     * @returns {Object} { ambiguous: boolean, reason: string }
     */
    checkAmbiguity(query) {
        const query_lower = query.toLowerCase().trim();

        // Very short queries are often ambiguous
        if (query_lower.length < 3) {
            return { ambiguous: true, reason: 'Query too short for reliable resolution' };
        }

        // Generic terms
        const genericTerms = ['port', 'coast', 'bay', 'near', 'ocean', 'sea', 'island'];
        if (genericTerms.includes(query_lower)) {
            return { ambiguous: true, reason: `"${query}" is too generic. Please specify a location (e.g., "Bay of Bengal", "Port of Mumbai")` };
        }

        return { ambiguous: false };
    }

    /**
     * Get all cached landmarks (for debugging)
     */
    getCachedLandmarks() {
        return Object.keys(this.cache);
    }

    /**
     * Clear cache (for testing)
     */
    clearCache() {
        this.cache = {};
        this._saveCache();
    }
}

// Export singleton instance
const geocodingService = new GeocodingService();
module.exports = geocodingService;
