/**
 * Geospatial Resolver
 * 
 * Deterministic location → bbox resolution using local datasets
 * No APIs, no ML, no hardcoded coordinates
 * 
 * Datasets (loaded at startup):
 * - oceans-seas.geo.json (primary: named seas/gulfs)
 * - ne_10m_ocean.shp (fallback: global oceans) [TODO]
 */

const fs = require('fs');
const path = require('path');

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
     * Resolve location string to bounding box
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

        console.warn(`[SpatialResolver] Location "${locationString}" not found in datasets`);
        return null;
    }

    /**
     * Get all available location names (for debugging)
     */
    getAvailableLocations() {
        if (!this.loaded) return [];
        return this.seasData.features.map(f => f.properties.NAME).sort();
    }
}

// Export singleton instance
const resolver = new SpatialResolver();
module.exports = resolver;
