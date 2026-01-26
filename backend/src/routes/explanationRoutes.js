/**
 * Explanation Routes
 * 
 * API endpoints for LLM-based explanation generation
 */

const express = require('express');
const router = express.Router();
const explanationService = require('../services/explanationService');

/**
 * POST /explain
 * Generate explanation for query results
 * 
 * Body:
 * - originalQuery: string (the user's original question)
 * - questionType: string (SPATIAL_TEMPORAL_QUERY, etc.)
 * - structuredResult: object/array (the computed result - will be summarized)
 * - displayContext: 'compact' | 'detailed' (optional, default: 'detailed')
 */
router.post('/explain', async (req, res) => {
    try {
        const { originalQuery, questionType, structuredResult, displayContext = 'detailed' } = req.body;

        if (!originalQuery || !questionType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: originalQuery and questionType'
            });
        }

        console.log(`[ExplanationRoute] Request for ${questionType}:`, originalQuery.substring(0, 50));

        const result = await explanationService.generateExplanation(
            originalQuery,
            questionType,
            structuredResult,
            displayContext
        );

        res.json({
            success: result.success,
            explanation: result.explanation,
            source: result.source
        });

    } catch (error) {
        console.error('[ExplanationRoute] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate explanation'
        });
    }
});

/**
 * GET /explain/stream
 * Stream explanation in real-time using SSE
 * 
 * Query params:
 * - originalQuery: string
 * - questionType: string
 * - displayContext: 'compact' | 'detailed'
 * 
 * Body (POST to /explain/stream):
 * - structuredResult: the data to explain
 */
router.post('/explain/stream', async (req, res) => {
    try {
        const { originalQuery, questionType, structuredResult, displayContext = 'detailed' } = req.body;

        if (!originalQuery || !questionType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Stream the explanation
        const stream = explanationService.generateExplanationStream(
            originalQuery,
            questionType,
            structuredResult,
            displayContext
        );

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('[ExplanationRoute] Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

/**
 * GET /explain/health
 * Check explanation service status
 */
router.get('/health', async (req, res) => {
    const health = await explanationService.healthCheck();
    res.json(health);
});

module.exports = router;
