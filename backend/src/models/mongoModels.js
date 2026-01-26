/**
 * MongoDB Models (for future modules)
 * 
 * These models will be used for web application data:
 * - User management
 * - Chat history
 * - Sessions
 * - Query logs
 * 
 * Note: ARGO ocean data lives in SQLite (READ-ONLY)
 */

const mongoose = require('mongoose');

/**
 * User Schema (for future authentication)
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

/**
 * Chat History Schema (for Module 5: AI Layer)
 */
const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous for PoC
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      queryType: String,
      apiEndpoint: String,
      resultCount: Number
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Query Log Schema (for analytics and debugging)
 */
const queryLogSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed
  },
  resultCount: {
    type: Number
  },
  executionTime: {
    type: Number // milliseconds
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    required: true
  },
  error: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Export models
module.exports = {
  User: mongoose.model('User', userSchema),
  ChatHistory: mongoose.model('ChatHistory', chatHistorySchema),
  QueryLog: mongoose.model('QueryLog', queryLogSchema)
};
