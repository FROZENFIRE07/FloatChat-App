/**
 * Input Validation Middleware
 * 
 * Module 3: Backend Query Layer
 * 
 * Validates and sanitizes all API inputs.
 * Critical for security and data integrity.
 */

const { validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Database errors
  if (err.message && err.message.includes('database')) {
    return res.status(503).json({
      success: false,
      error: 'Database unavailable',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

/**
 * Not found handler
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
};

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

module.exports = {
  validate,
  errorHandler,
  notFound,
  requestLogger
};
