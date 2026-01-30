/**
 * Main Server Application
 * 
 * Module 3: Backend Query Layer
 * 
 * FloatChat Backend - Exposes ARGO ocean data through REST API
 * 
 * Architecture:
 * - SQLite (READ-ONLY) for ARGO ocean data
 * - MongoDB for web application data
 * - Express REST API
 * - No AI at this layer (pure data access)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { argoDb, MongoConnection } = require('./config/database');
const { errorHandler, notFound, requestLogger } = require('./middleware/validation');
const argoRoutes = require('./routes/argoRoutes');
const healthRoutes = require('./routes/healthRoutes');
const chatRoutes = require('./routes/chatRoutes');
const explanationRoutes = require('./routes/explanationRoutes');
const spatialResolver = require('./services/spatialResolver');

// Initialize Express app
const app = express();

// Middleware - CORS with multi-origin support
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'FloatChat Backend API',
    version: '1.0.0',
    module: 'Module 3: Backend Query Layer + Module 5: AI Integration',
    description: 'SQL to API - Deterministic ARGO data access with AI intent parsing',
    endpoints: {
      health: '/api/v1/health',
      argo: '/api/v1/argo',
      chat: '/api/v1/chat',
      explain: '/api/v1/explain',
      docs: 'See README.md for API documentation'
    }
  });
});

// API Routes
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/argo`, argoRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/explain`, explanationRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database initialization and server startup
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('FloatChat Backend - Module 3: Backend Query Layer');
    console.log('='.repeat(60));

    // Initialize spatial resolver (load GeoJSON datasets)
    console.log('📍 Initializing spatial resolver...');
    await spatialResolver.init();

    // Connect to ARGO database (SQLite or PostgreSQL)
    // Note: PostgreSQL connection is async, SQLite is sync
    try {
      await argoDb.connect();
    } catch (dbError) {
      console.error('⚠️ ARGO database connection failed, server will start but ARGO queries will fail');
      console.error('   Error:', dbError.message);
    }

    // Connect to MongoDB (for web data)
    await MongoConnection.connect();

    // Start server
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 API Base: http://localhost:${PORT}${API_PREFIX}`);
      console.log(`💚 Health Check: http://localhost:${PORT}${API_PREFIX}/health`);
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📴 SIGTERM received. Shutting down gracefully...');
  argoDb.close();
  await MongoConnection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📴 SIGINT received. Shutting down gracefully...');
  argoDb.close();
  await MongoConnection.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
