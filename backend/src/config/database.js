/**
 * Database Configuration
 * 
 * Module 3: Backend Query Layer
 * 
 * This module configures connections to:
 * 1. ARGO Ocean Data - SQLite (local) OR Supabase PostgreSQL (production)
 * 2. MongoDB (web data) - users, sessions, logs
 * 
 * Environment Variables:
 * - USE_SUPABASE: 'true' to use PostgreSQL, otherwise SQLite
 * - SUPABASE_DATABASE_URL: PostgreSQL connection string
 * - ARGO_DB_PATH: Path to local SQLite file
 * - MONGODB_URI: MongoDB connection string
 */

const Database = require('better-sqlite3');
const mongoose = require('mongoose');
const path = require('path');

// Check which database mode to use
const USE_SUPABASE = process.env.USE_SUPABASE === 'true';

/**
 * ARGO Database Connection (SQLite - READ-ONLY)
 * Used for local development
 */
class ArgoSQLiteDatabase {
  constructor() {
    this.db = null;
  }

  connect() {
    try {
      const dbPath = path.resolve(__dirname, process.env.ARGO_DB_PATH);

      console.log('📊 Connecting to ARGO SQLite database...');
      console.log(`   Path: ${dbPath}`);

      this.db = new Database(dbPath, {
        readonly: true,
        fileMustExist: true
      });

      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('argo_profiles', 'argo_floats')
      `).all();

      if (tables.length !== 2) {
        throw new Error('Required tables not found. Please run Module 2 first.');
      }

      console.log('✅ ARGO SQLite database connected successfully');
      console.log(`   Tables: ${tables.map(t => t.name).join(', ')}`);

      return this.db;
    } catch (error) {
      console.error('❌ Failed to connect to ARGO SQLite database:', error.message);
      throw error;
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  healthCheck() {
    try {
      const result = this.db.prepare('SELECT COUNT(*) as count FROM argo_profiles').get();
      return {
        status: 'healthy',
        type: 'sqlite',
        profileCount: result.count
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: 'sqlite',
        error: error.message
      };
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('📊 ARGO SQLite database connection closed');
    }
  }
}

/**
 * ARGO Database Connection (PostgreSQL via Supabase)
 * Used for production deployment
 * 
 * Note: This uses the pg library for PostgreSQL connections
 */
class ArgoPostgresDatabase {
  constructor() {
    this.pool = null;
    this.pg = null;
  }

  async connect() {
    try {
      // Dynamically import pg only when needed
      const { Pool } = require('pg');

      const connectionString = process.env.SUPABASE_DATABASE_URL;
      if (!connectionString) {
        throw new Error('SUPABASE_DATABASE_URL environment variable is required for PostgreSQL mode');
      }

      console.log('📊 Connecting to ARGO PostgreSQL database (Supabase)...');

      this.pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,  // Increased timeout for pooler
        // Required for Supabase connection pooler (pgbouncer)
        application_name: 'floatchat-backend'
      });

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name IN ('argo_profiles', 'argo_floats')
      `);
      client.release();

      if (result.rows.length !== 2) {
        throw new Error('Required tables not found in Supabase database.');
      }

      console.log('✅ ARGO PostgreSQL database connected successfully');
      console.log(`   Tables: ${result.rows.map(r => r.table_name).join(', ')}`);

      return this.pool;
    } catch (error) {
      console.error('❌ Failed to connect to ARGO PostgreSQL database:', error.message);
      throw error;
    }
  }

  getDatabase() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async healthCheck() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT COUNT(*) as count FROM argo_profiles');
      client.release();
      return {
        status: 'healthy',
        type: 'postgresql',
        profileCount: parseInt(result.rows[0].count)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: 'postgresql',
        error: error.message
      };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('📊 ARGO PostgreSQL database connection closed');
    }
  }
}

/**
 * MongoDB Connection (for web application data)
 * Contains: users, sessions, chat_history, logs
 */
class MongoConnection {
  static async connect() {
    try {
      console.log('🍃 Connecting to MongoDB...');

      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  static healthCheck() {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: state === 1 ? 'healthy' : 'unhealthy',
      state: states[state]
    };
  }

  static async close() {
    await mongoose.connection.close();
    console.log('🍃 MongoDB connection closed');
  }
}

// Export singleton instance based on environment
const argoDb = USE_SUPABASE ? new ArgoPostgresDatabase() : new ArgoSQLiteDatabase();

console.log(`🔧 ARGO Database Mode: ${USE_SUPABASE ? 'PostgreSQL (Supabase)' : 'SQLite (Local)'}`);

module.exports = {
  argoDb,
  MongoConnection,
  USE_SUPABASE
};
