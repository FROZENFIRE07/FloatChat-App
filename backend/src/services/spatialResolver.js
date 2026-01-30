/**
 * Geospatial Resolver
 * 
 * Deterministic location → bbox resolution using local datasets + geocoding fallback
 * 
 * Priority Order:
 * 1. Local GeoJSON (oceans-seas.geo.json) - for seas, gulfs, oceans
 * 2. Geocoding Service (Nominatim) - for cities, ports, landmarks
 * 
 * No hardcoded coordinates - everything is resolved dynamically
 */

const fs = require('fs');
const path = require('path');
const geocodingService = require('./geocodingService');

class SpatialResolver {
    constructor() {
        this.seasData = null;
        this.loaded = false;
    }

    /**
     * Load geospatial datasets at startup
     */
    async init() {
        if (this.loaded) return;

        try {
            const seasPath = path.join(__dirname, '../../../coordinates_algo/oceans-seas.geojson-main/oceans-seas.geojson-main/oceans-seas.geo.json');
            const rawData = fs.readFileSync(seasPath, 'utf8');
            this.seasData = JSON.parse(rawData);
            this.loaded = true;
            console.log(`[SpatialResolver] Loaded ${this.seasData.features.length} named seas/gulfs`);

            // Also initialize geocoding service
            await geocodingService.init();
        } catch (error) {
            console.error('[SpatialResolver] Failed to load geospatial data:', error.message);
            throw error;
        }
    }

    /**
     * Normalize location string for lookup
     * "Arabian Sea" → "arabian sea"
     * "bay_of_bengal" → "bay of bengal"
     */
    normalizeName(locationString) {
        return locationString
            .toLowerCase()
            .trim()
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ');
    }

    /**
     * Calculate bounding box from GeoJSON geometry
     * @param {Object} geometry - GeoJSON geometry object
     * @returns {Object} { latMin, latMax, lonMin, lonMax }
     */
    calculateBbox(geometry) {
        let minLon = Infinity;
        let maxLon = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;

        const processCoordinate = (coord) => {
            const [lon, lat] = coord;
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        };

        const processCoordinates = (coords, depth = 0) => {
            if (depth === 0 && typeof coords[0] === 'number') {
                // Single coordinate [lon, lat]
                processCoordinate(coords);
            } else if (Array.isArray(coords[0])) {
                // Array of coordinates
                coords.forEach(c => processCoordinates(c, depth + 1));
            } else {
                processCoordinate(coords);
            }
        };

        if (geometry.type === 'Polygon') {
            processCoordinates(geometry.coordinates);
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => processCoordinates(polygon));
        } else if (geometry.type === 'Point') {
            processCoordinate(geometry.coordinates);
        }

        return {
            latMin: minLat,
            latMax: maxLat,
            lonMin: minLon,
            lonMax: maxLon
        };
    }

    /**
     * Resolve location string to bounding box (synchronous, GeoJSON only)
     * @param {string} locationString - Natural language location (e.g., "Arabian Sea")
     * @returns {Object|null} { latMin, latMax, lonMin, lonMax } or null if not found
     */
    resolve(locationString) {
        if (!this.loaded) {
            console.warn('[SpatialResolver] Not loaded yet, call init() first');
            return null;
        }

        const normalized = this.normalizeName(locationString);

        // Search in oceans-seas.geo.json
        const feature = this.seasData.features.find(f => {
            const featureName = this.normalizeName(f.properties.NAME || '');
            return featureName === normalized;
        });

        if (feature) {
            const bbox = this.calculateBbox(feature.geometry);
            console.log(`[SpatialResolver] Resolved "${locationString}" → bbox:`, bbox);
            return bbox;
        }

        console.warn(`[SpatialResolver] Location "${locationString}" not found in local datasets`);
        return null;
    }

    /**
     * Resolve location string to bounding box (async, with geocoding fallback)
     * 
     * This is the preferred method for landmark queries.
     * Tries local GeoJSON first, then falls back to Nominatim geocoding.
     * 
     * @param {string} locationString - Location name (e.g., "Mumbai", "Arabian Sea")
     * @returns {Object|null} { latMin, latMax, lonMin, lonMax, centroid, source, displayName }
     */
    async resolveWithGeocode(locationString) {
        if (!this.loaded) {
            await this.init();
        }

        // Step 1: Try local GeoJSON (seas, oceans, gulfs)
        const localResult = this.resolve(locationString);
        if (localResult) {
            // Calculate centroid for adaptive radius
            const centroid = {
                lat: (localResult.latMin + localResult.latMax) / 2,
                lon: (localResult.lonMin + localResult.lonMax) / 2
            };
            return {
                ...localResult,
                centroid,
                source: 'geojson',
                displayName: locationString,
                isOceanRegion: true
            };
        }

        // Step 2: Try geocoding service (cities, ports, landmarks)
        console.log(`[SpatialResolver] Trying geocoding for "${locationString}"...`);
        const geocodeResult = await geocodingService.resolveLandmark(locationString);

        if (geocodeResult) {
            // Use the geocoded bbox if available, otherwise create one from centroid
            let bbox;
            if (geocodeResult.bbox) {
                bbox = geocodeResult.bbox;
            } else {
                // Create a small bbox around the point (for dynamic radius to expand)
                const delta = 0.5; // ~55km at equator
                bbox = {
                    latMin: geocodeResult.lat - delta,
                    latMax: geocodeResult.lat + delta,
                    lonMin: geocodeResult.lon - delta,
                    lonMax: geocodeResult.lon + delta
                };
            }

            return {
                ...bbox,
                centroid: {
                    lat: geocodeResult.lat,
                    lon: geocodeResult.lon
                },
                source: 'nominatim',
                displayName: geocodeResult.displayName,
                type: geocodeResult.type,
                isOceanRegion: false
            };
        }

        // Both failed
        console.warn(`[SpatialResolver] Could not resolve "${locationString}" via any method`);
        return null;
    }

    /**
     * Check if a query might be ambiguous
     * @param {string} locationString - The query
     * @returns {Object} { ambiguous: boolean, reason: string }
     */
    checkAmbiguity(locationString) {
        return geocodingService.checkAmbiguity(locationString);
    }

    /**
     * Get all available location names from local GeoJSON (for debugging)
     */
    getAvailableLocations() {
        if (!this.loaded) return [];
        return this.seasData.features.map(f => f.properties.NAME).sort();
    }

    /**
     * Get cached geocoded landmarks (for debugging)
     */
    getCachedLandmarks() {
        return geocodingService.getCachedLandmarks();
    }
}

// Export singleton instance
const resolver = new SpatialResolver();
module.exports = resolver;

