/**
 * Dynamic Radius Service
 * 
 * Implements adaptive radius expansion for float discovery.
 * Instead of fixed radius, the system expands radius until sufficient floats are found.
 * 
 * Algorithm:
 * 1. Start with initial radius (100 km)
 * 2. Count floats in radius
 * 3. If insufficient, expand by step (50 km)
 * 4. Repeat until threshold reached or max radius hit
 * 
 * This feels AI-driven and adapts to sparse vs dense ocean regions.
 */

// Configuration
const RADIUS_CONFIG = {
    startRadiusKm: 100,      // Initial search radius
    maxRadiusKm: 600,        // Maximum search radius
    incrementStepKm: 50,     // Expansion step
    minFloatThreshold: 30,   // Minimum floats for reliable statistics
    minProfileThreshold: 100 // Minimum profiles for good coverage
};

/**
 * Convert kilometers to degrees (approximate)
 * At equator: 1 degree ≈ 111 km
 * At latitude L: 1 degree longitude ≈ 111 * cos(L) km
 * 
 * @param {number} km - Distance in kilometers
 * @param {number} latitude - Reference latitude for longitude conversion
 * @returns {Object} { latDegrees, lonDegrees }
 */
function kmToDegrees(km, latitude = 0) {
    const KM_PER_DEGREE_LAT = 111.32; // Constant
    const KM_PER_DEGREE_LON = 111.32 * Math.cos(latitude * Math.PI / 180);

    return {
        latDegrees: km / KM_PER_DEGREE_LAT,
        lonDegrees: km / KM_PER_DEGREE_LON
    };
}

/**
 * Haversine distance between two points
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km

    const toRad = (deg) => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Create a bounding box from a center point and radius
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} { latMin, latMax, lonMin, lonMax }
 */
function createBoundingBox(lat, lon, radiusKm) {
    const degrees = kmToDegrees(radiusKm, lat);

    return {
        latMin: lat - degrees.latDegrees,
        latMax: lat + degrees.latDegrees,
        lonMin: lon - degrees.lonDegrees,
        lonMax: lon + degrees.lonDegrees
    };
}

/**
 * Filter points by Haversine distance
 * @param {Array} points - Array of points with lat/lon properties
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Maximum distance in km
 * @returns {Array} Filtered points with distance property added
 */
function filterByDistance(points, centerLat, centerLon, radiusKm) {
    return points
        .map(point => {
            const distance = haversineDistance(
                centerLat, centerLon,
                point.latitude || point.lat,
                point.longitude || point.lon || point.lng
            );
            return { ...point, distanceKm: Math.round(distance * 10) / 10 };
        })
        .filter(point => point.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

class DynamicRadiusService {
    constructor() {
        this.config = { ...RADIUS_CONFIG };
    }

    /**
     * Find optimal radius for a given centroid
     * Uses a counting function to determine when to stop expanding
     * 
     * @param {Object} centroid - { lat, lon }
     * @param {Function} countFunction - async (bbox) => { floatCount, profileCount }
     * @param {Object} options - Optional overrides for thresholds
     * @returns {Object} { radiusKm, bbox, floatCount, profileCount, iterations, sparse }
     */
    async findOptimalRadius(centroid, countFunction, options = {}) {
        const {
            startRadiusKm = this.config.startRadiusKm,
            maxRadiusKm = this.config.maxRadiusKm,
            incrementStepKm = this.config.incrementStepKm,
            minFloatThreshold = this.config.minFloatThreshold,
            minProfileThreshold = this.config.minProfileThreshold
        } = options;

        let radiusKm = startRadiusKm;
        let iterations = 0;
        let lastResult = null;

        console.log(`[DynamicRadius] Starting search from ${centroid.lat.toFixed(3)}, ${centroid.lon.toFixed(3)}`);

        while (radiusKm <= maxRadiusKm) {
            iterations++;

            const bbox = createBoundingBox(centroid.lat, centroid.lon, radiusKm);
            const counts = await countFunction(bbox);

            console.log(`[DynamicRadius] Radius ${radiusKm}km → ${counts.floatCount} floats, ${counts.profileCount} profiles`);

            lastResult = {
                radiusKm,
                bbox,
                floatCount: counts.floatCount,
                profileCount: counts.profileCount,
                iterations,
                sparse: false
            };

            // Check if we have sufficient data
            if (counts.floatCount >= minFloatThreshold || counts.profileCount >= minProfileThreshold) {
                console.log(`[DynamicRadius] Found sufficient data at ${radiusKm}km`);
                return lastResult;
            }

            // Expand radius
            radiusKm += incrementStepKm;
        }

        // Max radius reached - mark as sparse region
        console.warn(`[DynamicRadius] Max radius ${maxRadiusKm}km reached - sparse region`);
        if (lastResult) {
            lastResult.sparse = true;
            lastResult.radiusKm = maxRadiusKm;
        }

        return lastResult || {
            radiusKm: maxRadiusKm,
            bbox: createBoundingBox(centroid.lat, centroid.lon, maxRadiusKm),
            floatCount: 0,
            profileCount: 0,
            iterations,
            sparse: true
        };
    }

    /**
     * Build spatial explanation for transparency
     * @param {string} landmark - Original landmark name
     * @param {Object} result - Result from findOptimalRadius
     * @returns {string} Human-readable explanation
     */
    buildExplanation(landmark, result) {
        if (result.sparse) {
            return `Floats were searched within a maximum radius (${result.radiusKm} km) from ${landmark}. ` +
                `This region appears to have sparse ocean data coverage (${result.floatCount} floats, ${result.profileCount} profiles found).`;
        }

        return `Floats were selected within an adaptive radius (≈${result.radiusKm} km) from ${landmark}, ` +
            `ensuring sufficient observations (${result.floatCount} floats, ${result.profileCount} profiles) for reliable statistics.`;
    }

    /**
     * Get configuration (for debugging/UI)
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Export singleton and utilities
const dynamicRadiusService = new DynamicRadiusService();

module.exports = {
    dynamicRadiusService,
    haversineDistance,
    kmToDegrees,
    createBoundingBox,
    filterByDistance,
    RADIUS_CONFIG
};
