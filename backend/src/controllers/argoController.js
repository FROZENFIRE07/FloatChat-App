/**
 * ARGO Data Controller
 * 
 * Module 3: Backend Query Layer
 * 
 * Handles HTTP requests and delegates to ArgoDataService.
 * Performs input validation and response formatting.
 */

const ArgoDataService = require('../services/argoDataService');

/**
 * Controller for region & time query
 * 
 * GET /api/v1/argo/region
 * Query params: latMin, latMax, lonMin, lonMax, timeStart, timeEnd, limit
 * Optional: centroidLat, centroidLon, radiusKm (for circular Haversine filtering)
 */
exports.getRegionData = async (req, res, next) => {
  try {
    const params = {
      latMin: parseFloat(req.query.latMin),
      latMax: parseFloat(req.query.latMax),
      lonMin: parseFloat(req.query.lonMin),
      lonMax: parseFloat(req.query.lonMax),
      timeStart: req.query.timeStart,
      timeEnd: req.query.timeEnd,
      limit: parseInt(req.query.limit) || 1000
    };

    // 🎯 Optional circular (Haversine) filter for landmark queries
    if (req.query.centroidLat && req.query.centroidLon && req.query.radiusKm) {
      params.centroid = {
        lat: parseFloat(req.query.centroidLat),
        lon: parseFloat(req.query.centroidLon)
      };
      params.radiusKm = parseFloat(req.query.radiusKm);
      console.log('🎯 Circular filter enabled:', { centroid: params.centroid, radiusKm: params.radiusKm });
    }

    console.log('Region query params:', params); // Debug log
    const result = await ArgoDataService.getRegionData(params);
    console.log('Query returned:', result.metadata); // Debug log
    res.json(result);
  } catch (error) {
    console.error('getRegionData error:', error);
    next(error);
  }
};

/**
 * Controller for vertical profile query
 * 
 * GET /api/v1/argo/profile/:floatId
 * Optional query param: timestamp
 */
exports.getVerticalProfile = async (req, res, next) => {
  try {
    const params = {
      floatId: req.params.floatId,
      timestamp: req.query.timestamp
    };

    const result = await ArgoDataService.getVerticalProfile(params);
    res.json(result);
  } catch (error) {
    console.error('getVerticalProfile error:', error);
    next(error);
  }
};

/**
 * Controller for nearest floats query
 * 
 * GET /api/v1/argo/nearest
 * Query params: latitude, longitude, radius, limit
 */
exports.getNearestFloats = async (req, res, next) => {
  try {
    const params = {
      latitude: parseFloat(req.query.latitude),
      longitude: parseFloat(req.query.longitude),
      radius: parseFloat(req.query.radius) || 5,
      limit: parseInt(req.query.limit) || 10
    };

    const result = await ArgoDataService.getNearestFloats(params);
    res.json(result);
  } catch (error) {
    console.error('getNearestFloats error:', error);
    next(error);
  }
};

/**
 * Controller for float metadata
 * 
 * GET /api/v1/argo/float/:floatId
 */
exports.getFloatMetadata = async (req, res, next) => {
  try {
    const floatId = req.params.floatId;
    const result = await ArgoDataService.getFloatMetadata(floatId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for database statistics
 * 
 * GET /api/v1/argo/stats
 */
exports.getDatabaseStats = async (req, res, next) => {
  try {
    const result = await ArgoDataService.getDatabaseStats();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * CATEGORY 4: Data Availability & Coverage
 * Controller for checking data availability
 * 
 * GET /api/v1/argo/availability
 * Query params: latMin, latMax, lonMin, lonMax, timeStart, timeEnd
 */
exports.checkDataAvailability = async (req, res, next) => {
  try {
    const params = {
      latMin: parseFloat(req.query.latMin),
      latMax: parseFloat(req.query.latMax),
      lonMin: parseFloat(req.query.lonMin),
      lonMax: parseFloat(req.query.lonMax),
      timeStart: req.query.timeStart,
      timeEnd: req.query.timeEnd
    };

    const result = await ArgoDataService.checkDataAvailability(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * CATEGORY 4: Data Availability & Coverage
 * Controller for getting active floats
 * 
 * GET /api/v1/argo/active-floats
 * Query params: timeStart, timeEnd, latMin (optional), latMax, lonMin, lonMax
 */
exports.getActiveFloats = async (req, res, next) => {
  try {
    const params = {
      timeStart: req.query.timeStart,
      timeEnd: req.query.timeEnd
    };

    // Optional region filtering
    if (req.query.latMin) {
      params.latMin = parseFloat(req.query.latMin);
      params.latMax = parseFloat(req.query.latMax);
      params.lonMin = parseFloat(req.query.lonMin);
      params.lonMax = parseFloat(req.query.lonMax);
    }

    const result = await ArgoDataService.getActiveFloats(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * CATEGORY 5: Simple Aggregations
 * Controller for regional statistics
 * 
 * GET /api/v1/argo/statistics
 * Query params: latMin, latMax, lonMin, lonMax, timeStart, timeEnd, variable
 */
exports.getRegionalStatistics = async (req, res, next) => {
  try {
    const params = {
      latMin: parseFloat(req.query.latMin),
      latMax: parseFloat(req.query.latMax),
      lonMin: parseFloat(req.query.lonMin),
      lonMax: parseFloat(req.query.lonMax),
      timeStart: req.query.timeStart,
      timeEnd: req.query.timeEnd,
      variable: req.query.variable || 'temperature'
    };

    const result = await ArgoDataService.getRegionalStatistics(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
