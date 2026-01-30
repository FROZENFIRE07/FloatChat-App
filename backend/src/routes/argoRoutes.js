/**
 * ARGO Data Routes
 * 
 * Module 3: Backend Query Layer
 * 
 * Defines all endpoints for ARGO data access.
 */

const express = require('express');
const { query, param } = require('express-validator');
const { validate } = require('../middleware/validation');
const argoController = require('../controllers/argoController');

const router = express.Router();

/**
 * @route   GET /api/v1/argo/region
 * @desc    Get ARGO data for a geographic region and time window
 * @access  Public
 * @query   latMin, latMax, lonMin, lonMax, timeStart, timeEnd, limit
 * @query   centroidLat, centroidLon, radiusKm (optional - for circular Haversine filtering)
 */
router.get(
  '/region',
  [
    query('latMin').isFloat({ min: -90, max: 90 }).withMessage('Invalid latMin'),
    query('latMax').isFloat({ min: -90, max: 90 }).withMessage('Invalid latMax'),
    query('lonMin').isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMin'),
    query('lonMax').isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMax'),
    query('timeStart').isISO8601().withMessage('Invalid timeStart format'),
    query('timeEnd').isISO8601().withMessage('Invalid timeEnd format'),
    query('limit').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid limit'),
    // Optional circular (Haversine) filter params
    query('centroidLat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid centroidLat'),
    query('centroidLon').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid centroidLon'),
    query('radiusKm').optional().isFloat({ min: 1, max: 1000 }).withMessage('Invalid radiusKm'),
    validate
  ],
  argoController.getRegionData
);

/**
 * @route   GET /api/v1/argo/profile/:floatId
 * @desc    Get vertical profile for a specific float
 * @access  Public
 * @param   floatId - Float identifier
 * @query   timestamp (optional) - Specific timestamp
 */
router.get(
  '/profile/:floatId',
  [
    param('floatId').isString().withMessage('Invalid floatId'),
    query('timestamp').optional().isISO8601().withMessage('Invalid timestamp format'),
    validate
  ],
  argoController.getVerticalProfile
);

/**
 * @route   GET /api/v1/argo/nearest
 * @desc    Find nearest floats to a location
 * @access  Public
 * @query   latitude, longitude, radius, limit
 */
router.get(
  '/nearest',
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius').optional().isFloat({ min: 0, max: 180 }).withMessage('Invalid radius'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
    validate
  ],
  argoController.getNearestFloats
);

/**
 * @route   GET /api/v1/argo/float/:floatId
 * @desc    Get metadata for a specific float
 * @access  Public
 * @param   floatId - Float identifier
 */
router.get(
  '/float/:floatId',
  [
    param('floatId').isString().withMessage('Invalid floatId'),
    validate
  ],
  argoController.getFloatMetadata
);

/**
 * @route   GET /api/v1/argo/stats
 * @desc    Get database statistics
 * @access  Public
 */
router.get('/stats', argoController.getDatabaseStats);

/**
 * CATEGORY 4: Data Availability & Coverage
 * @route   GET /api/v1/argo/availability
 * @desc    Check if data exists in a region/time without retrieving it
 * @access  Public
 * @query   latMin, latMax, lonMin, lonMax, timeStart, timeEnd
 */
router.get(
  '/availability',
  [
    query('latMin').isFloat({ min: -90, max: 90 }).withMessage('Invalid latMin'),
    query('latMax').isFloat({ min: -90, max: 90 }).withMessage('Invalid latMax'),
    query('lonMin').isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMin'),
    query('lonMax').isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMax'),
    query('timeStart').isISO8601().withMessage('Invalid timeStart format'),
    query('timeEnd').isISO8601().withMessage('Invalid timeEnd format'),
    validate
  ],
  argoController.checkDataAvailability
);

/**
 * CATEGORY 4: Data Availability & Coverage
 * @route   GET /api/v1/argo/active-floats
 * @desc    Get floats that were active during a time period
 * @access  Public
 * @query   timeStart, timeEnd, latMin (optional), latMax, lonMin, lonMax
 */
router.get(
  '/active-floats',
  [
    query('timeStart').isISO8601().withMessage('Invalid timeStart format'),
    query('timeEnd').isISO8601().withMessage('Invalid timeEnd format'),
    query('latMin').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latMin'),
    query('latMax').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latMax'),
    query('lonMin').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMin'),
    query('lonMax').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMax'),
    validate
  ],
  argoController.getActiveFloats
);

/**
 * CATEGORY 5: Simple Aggregations (Non-Interpretive)
 * @route   GET /api/v1/argo/statistics
 * @desc    Get mathematical summaries (min/max/avg) for a region
 * @access  Public
 * @query   latMin, latMax, lonMin, lonMax, timeStart, timeEnd, variable
 */
router.get(
  '/statistics',
  [
    query('latMin').isFloat({ min: -90, max: 90 }).withMessage('Invalid latMin'),
    query('latMax').isFloat({ min: -90, max: 90 }).withMessage('Invalid latMax'),
    query('lonMin').isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMin'),
    query('lonMax').isFloat({ min: -180, max: 180 }).withMessage('Invalid lonMax'),
    query('timeStart').isISO8601().withMessage('Invalid timeStart format'),
    query('timeEnd').isISO8601().withMessage('Invalid timeEnd format'),
    query('variable').optional().isIn(['temperature', 'salinity']).withMessage('Variable must be temperature or salinity'),
    validate
  ],
  argoController.getRegionalStatistics
);

module.exports = router;
