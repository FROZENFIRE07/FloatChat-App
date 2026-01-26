/**
 * Chat Routes - AI Intent Processing Endpoints
 * 
 * Module 5 Integration Layer
 * 
 * Endpoints:
 * - POST /api/v1/chat/parse    - Parse query to intent only
 * - POST /api/v1/chat/query    - Parse + execute query
 * - GET  /api/v1/chat/health   - Check AI service health
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const chatService = require('../services/chatService');
const argoController = require('../controllers/argoController');

const router = express.Router();

/**
 * @route   GET /api/v1/chat/health
 * @desc    Check AI intent parser health
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // Try a simple parse to check if HF is responsive
    const testResult = await chatService.parseIntent('test query');
    res.json({
      status: 'healthy',
      ai_service: 'huggingface',
      model: 'dipakaghade/floatchat-intent-parser',
      responsive: true
    });
  } catch (error) {
    res.json({
      status: 'degraded',
      ai_service: 'huggingface',
      error: error.message,
      responsive: false
    });
  }
});

/**
 * @route   POST /api/v1/chat/parse
 * @desc    Parse natural language query to structured intent
 * @access  Public
 * @body    { question: string }
 */
router.post(
  '/parse',
  [
    body('question')
      .isString()
      .trim()
      .isLength({ min: 3, max: 1000 })
      .withMessage('Question must be between 3 and 1000 characters')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { question } = req.body;

    try {
      const result = await chatService.processQuery(question);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          rawIntent: result.rawIntent
        });
      }

      res.json({
        success: true,
        question,
        intent: result.intent,
        apiMapping: result.apiMapping,
        rawIntent: result.rawIntent
      });
    } catch (error) {
      console.error('Parse error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to parse query',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/v1/chat/query
 * @desc    Parse query AND execute against ARGO database
 * @access  Public
 * @body    { question: string }
 */
router.post(
  '/query',
  [
    body('question')
      .isString()
      .trim()
      .isLength({ min: 3, max: 1000 })
      .withMessage('Question must be between 3 and 1000 characters')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { question } = req.body;

    try {
      // Step 1: Parse and validate intent
      const parseResult = await chatService.processQuery(question);
      
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          phase: 'parsing',
          error: parseResult.error,
          errorCode: parseResult.errorCode,
          rawIntent: parseResult.rawIntent
        });
      }

      const { intent, apiMapping } = parseResult;

      // Step 2: Execute query based on intent type
      let data = null;
      let queryError = null;

      try {
        data = await executeQuery(intent, apiMapping, req, res);
      } catch (error) {
        queryError = error.message;
      }

      // Return combined response
      res.json({
        success: !queryError,
        question,
        intent,
        apiMapping,
        data,
        error: queryError,
        metadata: {
          intentType: intent.intent_type,
          endpoint: apiMapping.endpoint,
          params: apiMapping.params
        }
      });
    } catch (error) {
      console.error('Query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process query',
        message: error.message
      });
    }
  }
);

/**
 * Execute query against ARGO database based on intent
 */
async function executeQuery(intent, apiMapping, req, res) {
  const ArgoDataService = require('../services/argoDataService');
  const { intentType, params } = apiMapping;

  switch (intentType) {
    case 'SPATIAL_TEMPORAL_QUERY':
      return ArgoDataService.getRegionData(params);

    case 'VERTICAL_PROFILE_QUERY':
      return ArgoDataService.getVerticalProfile({ floatId: params.floatId, timestamp: params.cycle });

    case 'NEAREST_FLOAT_QUERY':
      return ArgoDataService.getNearestFloats(params);

    case 'DATA_AVAILABILITY_QUERY':
      return ArgoDataService.checkDataAvailability(params);

    case 'AGGREGATION_QUERY':
      return ArgoDataService.getRegionalStatistics(params);

    default:
      throw new Error(`Unsupported intent type: ${intentType}`);
  }
}

module.exports = router;
