/**
 * API Service
 * 
 * Handles all communication with the backend API
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for large queries
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const argoAPI = {
  /**
   * Get region data (Category 1: Spatial + Temporal)
   */
  getRegionData: (params) => {
    return api.get('/argo/region', { params });
  },

  /**
   * Get vertical profile (Category 2: Vertical Profiles)
   */
  getVerticalProfile: (floatId, timestamp = null) => {
    return api.get(`/argo/profile/${floatId}`, {
      params: timestamp ? { timestamp } : {}
    });
  },

  /**
   * Get nearest floats (Category 3: Float Discovery)
   */
  getNearestFloats: (params) => {
    return api.get('/argo/nearest', { params });
  },

  /**
   * Get float metadata (Category 3: Float Discovery)
   */
  getFloatMetadata: (floatId) => {
    return api.get(`/argo/float/${floatId}`);
  },

  /**
   * Check data availability (Category 4: Data Availability)
   */
  checkDataAvailability: (params) => {
    return api.get('/argo/availability', { params });
  },

  /**
   * Get active floats (Category 4: Data Availability)
   */
  getActiveFloats: (params) => {
    return api.get('/argo/active-floats', { params });
  },

  /**
   * Get regional statistics (Category 5: Aggregations)
   */
  getRegionalStatistics: (params) => {
    return api.get('/argo/statistics', { params });
  },

  /**
   * Get database statistics (System)
   */
  getDatabaseStats: () => {
    return api.get('/argo/stats');
  },

  /**
   * Health check (System)
   */
  healthCheck: () => {
    return api.get('/health');
  },

  /**
   * ARGO database health (System)
   */
  argoHealthCheck: () => {
    return api.get('/health/argo');
  },

  /**
   * MongoDB health (System)
   */
  mongoHealthCheck: () => {
    return api.get('/health/mongo');
  },

  /**
   * Generate explanation for query results (LLM-powered)
   */
  generateExplanation: (originalQuery, questionType, structuredResult, displayContext = 'detailed') => {
    return api.post('/explain/explain', {
      originalQuery,
      questionType,
      structuredResult,
      displayContext
    });
  },

  /**
   * Check explanation service health
   */
  explanationHealthCheck: () => {
    return api.get('/explain/health');
  }
};

export default argoAPI;
