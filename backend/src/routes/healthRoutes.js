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
router.get('/', (req, res) => {
  const argoHealth = argoDb.healthCheck();
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
});

/**
 * @route   GET /api/v1/health/argo
 * @desc    ARGO database health check
 * @access  Public
 */
router.get('/argo', (req, res) => {
  const health = argoDb.healthCheck();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: true,
    ...health,
    timestamp: new Date().toISOString()
  });
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
