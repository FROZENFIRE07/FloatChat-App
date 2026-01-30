/**
 * Chat Service - AI Intent Orchestration Layer
 * 
 * Module 5 Integration:
 * - Calls HuggingFace AI intent parser
 * - Validates and normalizes AI output
 * - Maps validated intent to Module 3 API parameters
 * 
 * Flow: User Query → HF AI → Validation → API Mapping → Backend APIs
 */

const axios = require('axios');
const spatialResolver = require('./spatialResolver');

// HuggingFace Space endpoint (configurable for different environments)
const HF_INTENT_API = process.env.HF_INTENT_API_URL || 'https://dipakaghade-floatchat-intent-parser-space.hf.space/parse_intent';

// Intent type to API endpoint mapping
const INTENT_API_MAP = {
  'SPATIAL_TEMPORAL_QUERY': '/argo/region',
  'VERTICAL_PROFILE_QUERY': '/argo/profile',
  'NEAREST_FLOAT_QUERY': '/argo/nearest',
  'DATA_AVAILABILITY_QUERY': '/argo/availability',
  'AGGREGATION_QUERY': '/argo/statistics'
};

// Field aliases for normalization
const FIELD_ALIASES = {
  'lat': 'latitude',
  'lon': 'longitude',
  'lng': 'longitude',
  'lat_min': 'latitude_min',
  'lat_max': 'latitude_max',
  'lon_min': 'longitude_min',
  'lon_max': 'longitude_max',
  'min_lat': 'latitude_min',
  'max_lat': 'latitude_max',
  'min_lon': 'longitude_min',
  'max_lon': 'longitude_max',
  'start': 'start_date',
  'end': 'end_date',
  'date_start': 'start_date',
  'date_end': 'end_date',
  'from_date': 'start_date',
  'to_date': 'end_date',
  'start_time': 'start_date',
  'end_time': 'end_date',
  'time_start': 'start_date',
  'time_end': 'end_date',
  'float': 'float_id',
  'platform': 'float_id',
  'platform_number': 'float_id',
  'wmo': 'float_id',
  'variable': 'variables',
  'var': 'variables',
  'params': 'variables',
  'radius': 'radius_degrees',
  'distance': 'radius_degrees',
  'count': 'limit',
  'max_results': 'limit',
  'n': 'limit',
  'agg': 'aggregations',
  'aggregation': 'aggregations',
  'stats': 'aggregations'
};

// Schema definitions for each intent type
const INTENT_SCHEMAS = {
  'SPATIAL_TEMPORAL_QUERY': {
    required: [],
    optional: ['latitude_min', 'latitude_max', 'longitude_min', 'longitude_max',
      'start_date', 'end_date', 'variables', 'limit', 'region_semantic'],
    defaults: { limit: 100000 }
  },
  'VERTICAL_PROFILE_QUERY': {
    required: ['float_id'],
    optional: ['cycle_number', 'variables'],
    defaults: {}
  },
  'NEAREST_FLOAT_QUERY': {
    required: ['latitude', 'longitude'],
    optional: ['radius_degrees', 'limit'],
    defaults: { radius_degrees: 5.0, limit: 10 }
  },
  'DATA_AVAILABILITY_QUERY': {
    required: [],
    optional: ['latitude_min', 'latitude_max', 'longitude_min', 'longitude_max',
      'start_date', 'end_date', 'region_semantic'],
    defaults: {}
  },
  'AGGREGATION_QUERY': {
    required: ['variables'],
    optional: ['latitude_min', 'latitude_max', 'longitude_min', 'longitude_max',
      'start_date', 'end_date', 'aggregations', 'region_semantic'],
    defaults: { aggregations: ['mean', 'min', 'max'] }
  }
};

// Valid values
const VALID_VARIABLES = new Set(['temperature', 'salinity', 'pressure']);
const VALID_AGGREGATIONS = new Set(['min', 'max', 'mean', 'avg', 'count', 'sum', 'std']);

class ChatService {
  /**
   * Parse user query using HuggingFace AI
   * Includes retry logic for cold-start scenarios
   */
  async parseIntent(question, retries = 2) {
    const timeout = 90000; // 90 seconds for cold-start

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[ChatService] Calling HF API (attempt ${attempt}/${retries})...`);

        const response = await axios.post(HF_INTENT_API, { question }, {
          timeout,
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('[ChatService] HF API response received');

        // HF Space returns { raw_output: "JSON_STRING" }
        // We need to parse the JSON string
        const data = response.data;
        if (data.raw_output && typeof data.raw_output === 'string') {
          try {
            return JSON.parse(data.raw_output);
          } catch (parseError) {
            console.error('[ChatService] Failed to parse raw_output:', parseError.message);
            throw new Error('Failed to parse AI response as JSON');
          }
        }

        // If already parsed object, return as-is
        return data;
      } catch (error) {
        console.error(`[ChatService] HF API Error (attempt ${attempt}):`, error.message);

        // If it's not the last attempt and it's a timeout, retry
        if (attempt < retries && (error.code === 'ECONNABORTED' || error.message.includes('timeout'))) {
          console.log(`[ChatService] Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        throw new Error(`AI parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Normalize field names using aliases
   * Also handles single 'time' or 'date' fields by expanding to both start_date and end_date
   */
  normalizeFieldNames(raw) {
    const normalized = {};
    for (const [key, value] of Object.entries(raw)) {
      const canonical = FIELD_ALIASES[key.toLowerCase()] || key.toLowerCase();
      normalized[canonical] = value;
    }

    // If there's a single 'time' or 'date' field without start/end, expand it to both
    if ((normalized.time || normalized.date) && !normalized.start_date && !normalized.end_date) {
      const timeValue = normalized.time || normalized.date;
      normalized.start_date = timeValue;
      normalized.end_date = timeValue;
      delete normalized.time;
      delete normalized.date;
    }

    return normalized;
  }

  /**
   * Coerce value to float
   */
  coerceFloat(value) {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Coerce value to int
   */
  coerceInt(value) {
    if (value === null || value === undefined) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Coerce to list
   */
  coerceList(value) {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(v => v);
    }
    return [value];
  }

  /**
   * Normalize variables
   */
  normalizeVariables(value) {
    const items = this.coerceList(value);
    if (!items) return null;

    const normalized = [];
    for (const item of items) {
      let v = String(item).toLowerCase().trim();
      if (v === 'temp' || v === 't') v = 'temperature';
      if (v === 'sal' || v === 's' || v === 'psal') v = 'salinity';
      if (v === 'pres' || v === 'p' || v === 'depth') v = 'pressure';
      if (VALID_VARIABLES.has(v)) normalized.push(v);
    }
    return normalized.length ? normalized : null;
  }

  /**
   * Normalize aggregations
   */
  normalizeAggregations(value) {
    const items = this.coerceList(value);
    if (!items) return null;

    const normalized = [];
    for (const item of items) {
      let a = String(item).toLowerCase().trim();
      if (a === 'average') a = 'avg';
      if (a === 'minimum') a = 'min';
      if (a === 'maximum') a = 'max';
      if (VALID_AGGREGATIONS.has(a)) normalized.push(a);
    }
    return normalized.length ? normalized : null;
  }

  /**
   * Validate and normalize raw AI intent
   */
  validateAndNormalize(rawIntent) {
    if (!rawIntent || typeof rawIntent !== 'object') {
      return { valid: false, error: 'Intent must be an object', errorCode: 'INVALID_FORMAT' };
    }

    // Get intent type and normalize synonyms
    let intentType = rawIntent.intent_type?.toUpperCase?.()?.replace(/-/g, '_')?.replace(/ /g, '_');

    // Normalize AI inconsistencies
    if (intentType === 'AVAILABILITY_COVERAGE_QUERY') intentType = 'DATA_AVAILABILITY_QUERY';
    if (intentType === 'FLOAT_DISCOVERY_QUERY') intentType = 'NEAREST_FLOAT_QUERY';

    if (!intentType || !INTENT_SCHEMAS[intentType]) {
      return {
        valid: false,
        error: `Unknown intent_type: ${rawIntent.intent_type}`,
        errorCode: 'UNKNOWN_INTENT_TYPE'
      };
    }

    const schema = INTENT_SCHEMAS[intentType];
    const normalized = this.normalizeFieldNames(rawIntent);
    normalized.intent_type = intentType;

    // Build clean intent
    const allowedFields = new Set([...schema.required, ...schema.optional, 'intent_type']);
    const cleanIntent = { intent_type: intentType };

    // Process fields
    for (const field of allowedFields) {
      if (field === 'intent_type') continue;

      const rawValue = normalized[field];
      if (rawValue === null || rawValue === undefined) continue;

      // Type coercion based on field
      if (['latitude', 'latitude_min', 'latitude_max'].includes(field)) {
        const val = this.coerceFloat(rawValue);
        if (val !== null) {
          if (val < -90 || val > 90) {
            return { valid: false, error: `${field} must be between -90 and 90`, errorCode: 'VALIDATION_ERROR' };
          }
          cleanIntent[field] = val;
        }
      } else if (['longitude', 'longitude_min', 'longitude_max'].includes(field)) {
        const val = this.coerceFloat(rawValue);
        if (val !== null) {
          if (val < -180 || val > 180) {
            return { valid: false, error: `${field} must be between -180 and 180`, errorCode: 'VALIDATION_ERROR' };
          }
          cleanIntent[field] = val;
        }
      } else if (['radius_degrees'].includes(field)) {
        const val = this.coerceFloat(rawValue);
        if (val !== null) cleanIntent[field] = val;
      } else if (['limit', 'cycle_number'].includes(field)) {
        const val = this.coerceInt(rawValue);
        if (val !== null) cleanIntent[field] = val;
      } else if (field === 'float_id') {
        cleanIntent[field] = String(rawValue).trim();
      } else if (['start_date', 'end_date'].includes(field)) {
        cleanIntent[field] = String(rawValue).trim();
      } else if (field === 'variables') {
        const val = this.normalizeVariables(rawValue);
        if (val) cleanIntent[field] = val;
      } else if (field === 'aggregations') {
        const val = this.normalizeAggregations(rawValue);
        if (val) cleanIntent[field] = val;
      } else if (field === 'region_semantic') {
        // Preserve region_semantic for coordinate mapping
        cleanIntent[field] = String(rawValue).toLowerCase().trim().replace(/\s+/g, '_');
      }
    }

    // Apply defaults
    for (const [field, defaultVal] of Object.entries(schema.defaults)) {
      if (!(field in cleanIntent)) {
        cleanIntent[field] = defaultVal;
      }
    }

    // 🚨 CRITICAL FIX: Remove AI-provided limit
    // AI describes INTENT, never controls QUERY SIZE
    // Observed bug: AI returns limit=500 → truncates to 2 floats, only Jan 31
    if (cleanIntent.limit !== undefined) {
      console.warn(`[ChatService] Removing AI-provided limit=${cleanIntent.limit}. AI cannot control query size.`);
      delete cleanIntent.limit;
    }

    // Enforce system limits based on intent type
    if (intentType === 'SPATIAL_TEMPORAL_QUERY') {
      // For large spatial queries, use high limit or streaming
      cleanIntent.limit = 100000;
      console.log('[ChatService] Enforcing system limit for spatial query:', cleanIntent.limit);
    }

    // Check required fields
    for (const field of schema.required) {
      if (!(field in cleanIntent) || cleanIntent[field] === null) {
        return {
          valid: false,
          error: `Missing required field: ${field}`,
          errorCode: 'MISSING_REQUIRED_FIELD'
        };
      }
    }

    // Cross-field validation: swap min/max if reversed
    if (cleanIntent.latitude_min && cleanIntent.latitude_max &&
      cleanIntent.latitude_min > cleanIntent.latitude_max) {
      [cleanIntent.latitude_min, cleanIntent.latitude_max] =
        [cleanIntent.latitude_max, cleanIntent.latitude_min];
    }
    if (cleanIntent.longitude_min && cleanIntent.longitude_max &&
      cleanIntent.longitude_min > cleanIntent.longitude_max) {
      [cleanIntent.longitude_min, cleanIntent.longitude_max] =
        [cleanIntent.longitude_max, cleanIntent.longitude_min];
    }

    return { valid: true, intent: cleanIntent };
  }

  /**
   * Map semantic region names to coordinates using geospatial datasets (sync)
   * Kept for backward compatibility
   */
  getRegionCoordinates(regionSemantic) {
    // Use deterministic spatial resolver (loads from local GeoJSON)
    const bbox = spatialResolver.resolve(regionSemantic);

    if (bbox) {
      return bbox;
    }

    // No more hardcoded fallbacks - return null to trigger async resolution
    console.warn(`[ChatService] Sync resolution failed for "${regionSemantic}", try async method`);
    return null;
  }

  /**
   * Map semantic region names to coordinates (async version with geocoding)
   * 
   * This is the preferred method - uses GeoJSON for seas/oceans,
   * then falls back to Nominatim geocoding for cities/landmarks.
   * 
   * @param {string} regionSemantic - Region name (e.g., "Mumbai", "Arabian Sea")
   * @returns {Object|null} { latMin, latMax, lonMin, lonMax, centroid, source, displayName }
   */
  async getRegionCoordinatesAsync(regionSemantic) {
    const result = await spatialResolver.resolveWithGeocode(regionSemantic);

    if (result) {
      console.log(`[ChatService] Async resolved "${regionSemantic}" via ${result.source}`);
      return result;
    }

    // Check if query is ambiguous
    const ambiguity = spatialResolver.checkAmbiguity(regionSemantic);
    if (ambiguity.ambiguous) {
      console.warn(`[ChatService] Ambiguous query: ${ambiguity.reason}`);
    }

    return null;
  }

  /**
   * Build spatial explanation for transparency in results
   * @param {Object} spatialResult - Result from getRegionCoordinatesAsync (with optional adaptiveRadiusKm)
   * @param {Object} radiusInfo - Optional radius info for landmark queries (legacy)
   * @returns {string} Human-readable explanation
   */
  buildSpatialExplanation(spatialResult, radiusInfo = null) {
    if (!spatialResult) return null;

    const locationName = spatialResult.displayName || 'the specified region';
    const source = spatialResult.source === 'nominatim' ? 'geocoding' : 'ocean database';

    // Check for adaptive radius in spatialResult (new approach)
    if (spatialResult.adaptiveRadiusKm) {
      return `Floats were selected within an adaptive radius (≈${spatialResult.adaptiveRadiusKm} km) from ${locationName}, ` +
        `ensuring coverage of nearby ocean areas. Location resolved via ${source}.`;
    }

    if (radiusInfo) {
      if (radiusInfo.sparse) {
        return `Floats were searched within a maximum radius (${radiusInfo.radiusKm} km) from ${locationName}. ` +
          `This region appears to have sparse ocean data coverage (${radiusInfo.floatCount} floats found).`;
      }
      return `Floats were selected within an adaptive radius (≈${radiusInfo.radiusKm} km) from ${locationName}, ` +
        `ensuring sufficient observations for reliable statistics. Location resolved via ${source}.`;
    }

    if (spatialResult.isOceanRegion) {
      return `Data filtered for ${locationName} using predefined ocean boundaries.`;
    }

    return `Data filtered near ${locationName}, resolved via ${source}.`;
  }

  /**
   * Map validated intent to backend API parameters
   */
  mapIntentToApiParams(intent) {
    const intentType = intent.intent_type;
    const params = {};

    // 🚨 CRITICAL: If region_semantic is present but no explicit coordinates, resolve it
    // Must fail-fast if resolution fails - NO spatial query without valid bbox
    if (intent.region_semantic && intent.latitude_min === undefined) {
      console.log('[ChatService] Resolving region_semantic:', intent.region_semantic);

      const regionCoords = this.getRegionCoordinates(intent.region_semantic);

      // 🚨 FAIL FAST: Cannot execute spatial query without bbox
      if (!regionCoords) {
        const error = new Error(
          `Spatial resolution failed for region: "${intent.region_semantic}". ` +
          `Cannot execute spatial query without valid bounding box. ` +
          `Please check region name or specify explicit coordinates.`
        );
        error.code = 'SPATIAL_RESOLUTION_FAILED';
        throw error;
      }

      console.log('[ChatService] Resolved bbox:', regionCoords);

      params.latMin = regionCoords.latMin;
      params.latMax = regionCoords.latMax;
      params.lonMin = regionCoords.lonMin;
      params.lonMax = regionCoords.lonMax;
    }

    switch (intentType) {
      case 'SPATIAL_TEMPORAL_QUERY':
        if (intent.latitude_min !== undefined) params.latMin = intent.latitude_min;
        if (intent.latitude_max !== undefined) params.latMax = intent.latitude_max;
        if (intent.longitude_min !== undefined) params.lonMin = intent.longitude_min;
        if (intent.longitude_max !== undefined) params.lonMax = intent.longitude_max;
        if (intent.start_date) params.timeStart = this.formatDate(intent.start_date);
        if (intent.end_date) params.timeEnd = this.formatDate(intent.end_date, true);
        if (intent.limit) params.limit = intent.limit;
        break;

      case 'VERTICAL_PROFILE_QUERY':
        params.floatId = intent.float_id;
        if (intent.cycle_number) params.cycle = intent.cycle_number;
        break;

      case 'NEAREST_FLOAT_QUERY':
        params.latitude = intent.latitude;
        params.longitude = intent.longitude;
        if (intent.radius_degrees) params.radius = intent.radius_degrees;
        if (intent.limit) params.limit = intent.limit;
        break;

      case 'DATA_AVAILABILITY_QUERY':
        if (intent.latitude_min !== undefined) params.latMin = intent.latitude_min;
        if (intent.latitude_max !== undefined) params.latMax = intent.latitude_max;
        if (intent.longitude_min !== undefined) params.lonMin = intent.longitude_min;
        if (intent.longitude_max !== undefined) params.lonMax = intent.longitude_max;
        if (intent.start_date) params.timeStart = this.formatDate(intent.start_date);
        if (intent.end_date) params.timeEnd = this.formatDate(intent.end_date, true);
        break;

      case 'AGGREGATION_QUERY':
        if (intent.latitude_min !== undefined) params.latMin = intent.latitude_min;
        if (intent.latitude_max !== undefined) params.latMax = intent.latitude_max;
        if (intent.longitude_min !== undefined) params.lonMin = intent.longitude_min;
        if (intent.longitude_max !== undefined) params.lonMax = intent.longitude_max;
        if (intent.start_date) params.timeStart = this.formatDate(intent.start_date);
        if (intent.end_date) params.timeEnd = this.formatDate(intent.end_date, true);
        if (intent.variables?.length) params.variable = intent.variables[0]; // API takes single variable
        break;
    }

    return {
      endpoint: INTENT_API_MAP[intentType],
      params,
      intentType
    };
  }

  /**
   * Map validated intent to backend API parameters (async version)
   * 
   * Uses async geocoding for landmark resolution.
   * This is the preferred method for processing queries.
   * 
   * @param {Object} intent - Validated intent object
   * @returns {Object} { endpoint, params, intentType, spatialMeta }
   */
  async mapIntentToApiParamsAsync(intent) {
    const intentType = intent.intent_type;
    const params = {};
    let spatialMeta = null;

    // 🚨 CRITICAL: If region_semantic is present but no explicit coordinates, resolve it
    // Now uses async geocoding with Nominatim fallback
    if (intent.region_semantic && intent.latitude_min === undefined) {
      console.log('[ChatService] Resolving region_semantic (async):', intent.region_semantic);

      const regionCoords = await this.getRegionCoordinatesAsync(intent.region_semantic);

      // 🚨 FAIL FAST: Cannot execute spatial query without bbox
      if (!regionCoords) {
        const error = new Error(
          `Spatial resolution failed for region: "${intent.region_semantic}". ` +
          `Cannot execute spatial query without valid bounding box. ` +
          `Please check region name or specify explicit coordinates.`
        );
        error.code = 'SPATIAL_RESOLUTION_FAILED';
        throw error;
      }

      console.log('[ChatService] Resolved bbox (async):', regionCoords);

      // 🌊 ADAPTIVE RADIUS FOR LANDMARKS (cities, ports)
      // Ocean regions use their full bbox, but landmarks need expanded search
      // to find nearby ocean floats
      if (!regionCoords.isOceanRegion && regionCoords.centroid) {
        // Default search radius for landmarks: 300km
        // This covers coastal areas and nearby ocean
        const DEFAULT_LANDMARK_RADIUS_KM = 300;
        const KM_PER_DEGREE_LAT = 111.32;
        const KM_PER_DEGREE_LON = 111.32 * Math.cos(regionCoords.centroid.lat * Math.PI / 180);

        const latDelta = DEFAULT_LANDMARK_RADIUS_KM / KM_PER_DEGREE_LAT;
        const lonDelta = DEFAULT_LANDMARK_RADIUS_KM / KM_PER_DEGREE_LON;

        params.latMin = regionCoords.centroid.lat - latDelta;
        params.latMax = regionCoords.centroid.lat + latDelta;
        params.lonMin = regionCoords.centroid.lon - lonDelta;
        params.lonMax = regionCoords.centroid.lon + lonDelta;

        console.log(`[ChatService] 🎯 Applied adaptive radius (${DEFAULT_LANDMARK_RADIUS_KM}km) for landmark "${intent.region_semantic}"`);
        console.log(`[ChatService] Expanded bbox: lat[${params.latMin.toFixed(2)}, ${params.latMax.toFixed(2)}] lon[${params.lonMin.toFixed(2)}, ${params.lonMax.toFixed(2)}]`);

        // Store spatial metadata with radius info
        spatialMeta = {
          centroid: regionCoords.centroid,
          source: regionCoords.source,
          displayName: regionCoords.displayName,
          isOceanRegion: regionCoords.isOceanRegion,
          adaptiveRadiusKm: DEFAULT_LANDMARK_RADIUS_KM
        };
      } else {
        // Ocean region - use the full bbox from GeoJSON
        params.latMin = regionCoords.latMin;
        params.latMax = regionCoords.latMax;
        params.lonMin = regionCoords.lonMin;
        params.lonMax = regionCoords.lonMax;

        // Store spatial metadata for explanation
        spatialMeta = {
          centroid: regionCoords.centroid,
          source: regionCoords.source,
          displayName: regionCoords.displayName,
          isOceanRegion: regionCoords.isOceanRegion
        };
      }
    }

    switch (intentType) {
      case 'SPATIAL_TEMPORAL_QUERY':
        if (intent.latitude_min !== undefined) params.latMin = intent.latitude_min;
        if (intent.latitude_max !== undefined) params.latMax = intent.latitude_max;
        if (intent.longitude_min !== undefined) params.lonMin = intent.longitude_min;
        if (intent.longitude_max !== undefined) params.lonMax = intent.longitude_max;
        if (intent.start_date) params.timeStart = this.formatDate(intent.start_date);
        if (intent.end_date) params.timeEnd = this.formatDate(intent.end_date, true);
        if (intent.limit) params.limit = intent.limit;
        break;

      case 'VERTICAL_PROFILE_QUERY':
        params.floatId = intent.float_id;
        if (intent.cycle_number) params.cycle = intent.cycle_number;
        break;

      case 'NEAREST_FLOAT_QUERY':
        params.latitude = intent.latitude;
        params.longitude = intent.longitude;
        if (intent.radius_degrees) params.radius = intent.radius_degrees;
        if (intent.limit) params.limit = intent.limit;
        break;

      case 'DATA_AVAILABILITY_QUERY':
        if (intent.latitude_min !== undefined) params.latMin = intent.latitude_min;
        if (intent.latitude_max !== undefined) params.latMax = intent.latitude_max;
        if (intent.longitude_min !== undefined) params.lonMin = intent.longitude_min;
        if (intent.longitude_max !== undefined) params.lonMax = intent.longitude_max;
        if (intent.start_date) params.timeStart = this.formatDate(intent.start_date);
        if (intent.end_date) params.timeEnd = this.formatDate(intent.end_date, true);
        break;

      case 'AGGREGATION_QUERY':
        if (intent.latitude_min !== undefined) params.latMin = intent.latitude_min;
        if (intent.latitude_max !== undefined) params.latMax = intent.latitude_max;
        if (intent.longitude_min !== undefined) params.lonMin = intent.longitude_min;
        if (intent.longitude_max !== undefined) params.lonMax = intent.longitude_max;
        if (intent.start_date) params.timeStart = this.formatDate(intent.start_date);
        if (intent.end_date) params.timeEnd = this.formatDate(intent.end_date, true);
        if (intent.variables?.length) params.variable = intent.variables[0];
        break;
    }

    return {
      endpoint: INTENT_API_MAP[intentType],
      params,
      intentType,
      spatialMeta
    };
  }

  /**
   * Format date string to ISO format
   * Handles month-year formats like "Jan 2019", "January 2019"
   * Returns { start, end } for month-year or single date string for specific dates
   */
  formatDate(dateStr, isEndDate = false) {
    if (!dateStr) return null;

    // Already ISO format
    if (dateStr.includes('T')) return dateStr;

    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return `${dateStr}T00:00:00Z`;
    }

    // Handle month-year formats: "Jan 2019", "January 2019", "2019-01", "01/2019"
    const monthNames = {
      'jan': 1, 'january': 1,
      'feb': 2, 'february': 2,
      'mar': 3, 'march': 3,
      'apr': 4, 'april': 4,
      'may': 5,
      'jun': 6, 'june': 6,
      'jul': 7, 'july': 7,
      'aug': 8, 'august': 8,
      'sep': 9, 'september': 9,
      'oct': 10, 'october': 10,
      'nov': 11, 'november': 11,
      'dec': 12, 'december': 12
    };

    const dateStrLower = dateStr.toLowerCase().trim();

    // Match "Jan 2019" or "January 2019"
    const monthYearMatch = dateStrLower.match(/^([a-z]+)\s+(\d{4})$/);
    if (monthYearMatch) {
      const month = monthNames[monthYearMatch[1]];
      const year = parseInt(monthYearMatch[2]);
      if (month && year) {
        if (isEndDate) {
          // Last day of month
          const lastDay = new Date(year, month, 0).getDate();
          return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;
        } else {
          // First day of month
          return `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        }
      }
    }

    // Match "2019-01" format
    const isoMonthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
    if (isoMonthMatch) {
      const year = parseInt(isoMonthMatch[1]);
      const month = parseInt(isoMonthMatch[2]);
      if (isEndDate) {
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;
      } else {
        return `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
      }
    }

    return dateStr;
  }

  /**
   * Process a chat query end-to-end
   * Returns: { success, intent, apiMapping, spatialExplanation, error }
   */
  async processQuery(question) {
    console.log('[ChatService DEBUG] Input question:', question);

    // Step 1: Call HuggingFace AI
    let rawIntent;
    try {
      rawIntent = await this.parseIntent(question);
      console.log('[ChatService DEBUG] Raw AI intent:', JSON.stringify(rawIntent, null, 2));
    } catch (error) {
      console.error('[ChatService DEBUG] AI parsing error:', error.message);
      return {
        success: false,
        error: `AI parsing failed: ${error.message}`,
        errorCode: 'AI_ERROR'
      };
    }

    // Step 2: Validate and normalize
    const validationResult = this.validateAndNormalize(rawIntent);
    console.log('[ChatService DEBUG] Validation result:', JSON.stringify(validationResult, null, 2));

    if (!validationResult.valid) {
      return {
        success: false,
        rawIntent,
        error: validationResult.error,
        errorCode: validationResult.errorCode
      };
    }

    // Step 3: Map to API parameters (now async with geocoding)
    let apiMapping;
    try {
      apiMapping = await this.mapIntentToApiParamsAsync(validationResult.intent);
      console.log('[ChatService DEBUG] API mapping:', JSON.stringify(apiMapping, null, 2));
    } catch (error) {
      // Handle spatial resolution failures gracefully
      if (error.code === 'SPATIAL_RESOLUTION_FAILED') {
        console.error('[ChatService DEBUG] Spatial resolution failed:', error.message);
        return {
          success: false,
          rawIntent,
          intent: validationResult.intent,
          error: error.message,
          errorCode: 'SPATIAL_RESOLUTION_FAILED'
        };
      }
      throw error;
    }

    // Step 4: Build spatial explanation if applicable
    let spatialExplanation = null;
    if (apiMapping.spatialMeta) {
      spatialExplanation = this.buildSpatialExplanation(apiMapping.spatialMeta);
      console.log('[ChatService DEBUG] Spatial explanation:', spatialExplanation);
    }

    return {
      success: true,
      rawIntent,
      intent: validationResult.intent,
      apiMapping,
      spatialExplanation
    };
  }
}

module.exports = new ChatService();
