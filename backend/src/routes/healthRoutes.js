/**
 * Health Check Routes
 * 
 * Module 3: Backend Query Layer
 * 
 * System health and status endpoints.
 */

const express = require('express');
const { argoDb, MongoConnection } = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Overall system health check
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Handle both sync and async healthCheck
    const argoHealth = typeof argoDb.healthCheck === 'function'
      ? (argoDb.healthCheck.constructor.name === 'AsyncFunction'
        ? await argoDb.healthCheck()
        : argoDb.healthCheck())
      : { status: 'unknown', error: 'healthCheck not available' };

    const mongoHealth = MongoConnection.healthCheck();

    const overallStatus =
      argoHealth.status === 'healthy' && mongoHealth.status === 'healthy'
        ? 'healthy'
        : 'degraded';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        argoDatabase: argoHealth,
        mongoDatabase: mongoHealth
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/health/argo
 * @desc    ARGO database health check
 * @access  Public
 */
router.get('/argo', async (req, res) => {
  try {
    const health = typeof argoDb.healthCheck === 'function'
      ? (argoDb.healthCheck.constructor.name === 'AsyncFunction'
        ? await argoDb.healthCheck()
        : argoDb.healthCheck())
      : { status: 'unknown' };

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: true,
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/health/mongo
 * @desc    MongoDB health check
 * @access  Public
 */
router.get('/mongo', (req, res) => {
  const health = MongoConnection.healthCheck();

  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: true,
    ...health,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
