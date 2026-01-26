/**
 * Intent Parser API Client
 * 
 * Connects to the backend chat service which orchestrates:
 * - HuggingFace AI intent parsing (dipakaghade/floatchat-intent-parser)
 * - Intent validation and normalization
 * - API parameter mapping
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const CHAT_API_URL = `${API_BASE_URL}/chat`;

class IntentParserService {
  /**
   * Check if the intent parser API is healthy
   */
  async healthCheck() {
    try {
      const response = await fetch(`${CHAT_API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.status === 'healthy' && data.responsive;
    } catch (error) {
      console.error('Intent parser health check failed:', error);
      return false;
    }
  }

  /**
   * Parse a single natural language query into structured intent
   * 
   * @param {string} query - Natural language query from user
   * @returns {Promise<object>} Parsed and validated intent object
   */
  async parseQuery(query) {
    try {
      const response = await fetch(`${CHAT_API_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Parse failed: ${response.status}`);
      }

      return data.intent;
    } catch (error) {
      console.error('Intent parsing error:', error);
      throw error;
    }
  }

  /**
   * Parse query AND execute against ARGO database
   * Returns both intent and data
   * 
   * @param {string} query - Natural language query from user
   * @returns {Promise<object>} { intent, data, apiMapping }
   */
  async queryWithData(query) {
    try {
      const response = await fetch(`${CHAT_API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Query failed: ${response.status}`);
      }

      return {
        intent: data.intent,
        data: data.data,
        apiMapping: data.apiMapping,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Query with data error:', error);
      throw error;
    }
  }

  /**
   * Parse query and return intent with API mapping
   * This is the primary method for the new AI-powered flow
   * 
   * @param {string} query - Natural language query from user
   * @returns {Promise<object>} { success, intent, apiMapping, rawIntent, error }
   */
  async parseQueryWithMapping(query) {
    try {
      const response = await fetch(`${CHAT_API_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Parse failed: ${response.status}`,
          errorCode: data.errorCode,
          rawIntent: data.rawIntent
        };
      }

      return {
        success: true,
        intent: data.intent,
        apiMapping: data.apiMapping,
        rawIntent: data.rawIntent
      };
    } catch (error) {
      console.error('Parse with mapping error:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to AI service'
      };
    }
  }

  /**
   * Get API mapping for an intent (useful for debugging)
   * 
   * @param {string} query - Natural language query from user
   * @returns {Promise<object>} { intent, apiMapping }
   */
  async getApiMapping(query) {
    try {
      const response = await fetch(`${CHAT_API_URL}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Parse failed: ${response.status}`);
      }

      return {
        intent: data.intent,
        apiMapping: data.apiMapping,
        rawIntent: data.rawIntent
      };
    } catch (error) {
      console.error('API mapping error:', error);
      throw error;
    }
  }
}

export default new IntentParserService();
