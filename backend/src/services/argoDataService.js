/**
 * ARGO Data Service
 * 
 * Module 3: Backend Query Layer
 * 
 * This service provides deterministic data access to ARGO ocean data.
 * 
 * Rules:
 * - No AI, no interpretation, no inference
 * - Validated inputs only
 * - Structured JSON outputs
 * - All queries are deterministic
 * 
 * Supports query patterns validated in Module 2:
 * 1. Region & time filtering
 * 2. Vertical profile retrieval
 * 3. Nearest float discovery
 */

const { argoDb } = require('../config/database');

class ArgoDataService {
  /**
   * Query 1: Get data by region and time
   * 
   * Returns temperature/salinity data for a geographic region and time window.
   * Used for: maps, regional plots, temporal analysis
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.latMin - Minimum latitude
   * @param {number} params.latMax - Maximum latitude
   * @param {number} params.lonMin - Minimum longitude
   * @param {number} params.lonMax - Maximum longitude
   * @param {string} params.timeStart - Start timestamp (ISO format)
   * @param {string} params.timeEnd - End timestamp (ISO format)
   * @param {number} params.limit - Maximum number of results (default: 1000)
   * @param {Object} params.centroid - Optional: { lat, lon } for circular filtering
   * @param {number} params.radiusKm - Optional: Radius in km for circular filtering
   */
  static getRegionData(params) {
    const {
      latMin,
      latMax,
      lonMin,
      lonMax,
      timeStart,
      timeEnd,
      limit = 1000,
      centroid = null,  // For circular (Haversine) filtering
      radiusKm = null   // Radius in kilometers
    } = params;

    const db = argoDb.getDatabase();

    // Query with bounds and limit
    const query = db.prepare(`
      SELECT 
        float_id,
        timestamp,
        latitude,
        longitude,
        depth,
        temperature,
        salinity,
        pressure
      FROM argo_profiles
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC, depth ASC
      LIMIT ?
    `);


    const results = query.all(
      latMin, latMax,
      lonMin, lonMax,
      timeStart, timeEnd,
      limit
    );

    // 🚨 CRITICAL: Normalize longitude (0-360 → -180...+180)
    // ARGO data may use 0-360 format, must normalize before filtering
    let normalizedResults = results.map(row => ({
      ...row,
      longitude: row.longitude > 180 ? row.longitude - 360 : row.longitude
    }));

    // 🎯 HAVERSINE POST-FILTER: For circular (landmark) queries
    // When centroid + radiusKm provided, filter by true distance, not bbox
    if (centroid && radiusKm) {
      const EARTH_RADIUS_KM = 6371;

      const haversineDistance = (lat1, lon1, lat2, lon2) => {
        const toRad = (deg) => deg * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
      };

      const beforeCount = normalizedResults.length;
      normalizedResults = normalizedResults.filter(row => {
        const dist = haversineDistance(centroid.lat, centroid.lon, row.latitude, row.longitude);
        return dist <= radiusKm;
      });

      console.log(`[ArgoDataService] 🎯 Haversine filter: ${beforeCount} → ${normalizedResults.length} (within ${radiusKm}km of ${centroid.lat.toFixed(2)}, ${centroid.lon.toFixed(2)})`);
    }

    // 🚨 DEV MODE ASSERTION: Verify all results are within bbox
    if (process.env.NODE_ENV === 'development' && !centroid) {
      normalizedResults.forEach(row => {
        if (row.latitude < latMin || row.latitude > latMax ||
          row.longitude < lonMin || row.longitude > lonMax) {
          console.error('[BBOX VIOLATION] Point outside requested bbox:', {
            point: { lat: row.latitude, lon: row.longitude },
            bbox: { latMin, latMax, lonMin, lonMax },
            float_id: row.float_id,
            timestamp: row.timestamp
          });
        }
      });
    }

    // 🚨 DIAGNOSTIC: Temporal spread logging
    // If min == max == Jan 31 → LIMIT is truncating before time coverage is complete
    if (normalizedResults.length > 0) {
      const timestamps = normalizedResults.map(r => new Date(r.timestamp).getTime());
      const minTime = new Date(Math.min(...timestamps));
      const maxTime = new Date(Math.max(...timestamps));
      const uniqueFloats = new Set(normalizedResults.map(r => r.float_id)).size;

      console.log('[ArgoDataService] Query results:', {
        count: normalizedResults.length,
        uniqueFloats: uniqueFloats,
        timeRange: {
          start: minTime.toISOString().split('T')[0],
          end: maxTime.toISOString().split('T')[0]
        },
        requestedBounds: {
          time: `${timeStart} to ${timeEnd}`,
          bbox: `lat[${latMin},${latMax}] lon[${lonMin},${lonMax}]`
        }
      });

      // Warning if time collapsed
      if (minTime.getTime() === maxTime.getTime()) {
        console.warn('[ArgoDataService] ⚠️  TIME COLLAPSE DETECTED: All profiles from single date!');
      }
    }

    // Calculate metadata
    const metadata = this._calculateMetadata(normalizedResults);

    return {
      success: true,
      data: normalizedResults,
      metadata: {
        count: normalizedResults.length,
        bounds: {
          latitude: { min: latMin, max: latMax },
          longitude: { min: lonMin, max: lonMax },
          time: { start: timeStart, end: timeEnd }
        },
        ...metadata
      }
    };
  }

  /**
   * Query 2: Get vertical profile for a specific float
   * 
   * Returns complete depth profile for a single float at a specific time.
   * Used for: depth vs temperature/salinity plots
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.floatId - Float identifier
   * @param {string} params.timestamp - Specific timestamp (optional, uses latest if not provided)
   */
  static getVerticalProfile(params) {
    const { floatId, timestamp } = params;
    const db = argoDb.getDatabase();

    // If no timestamp provided, get the latest
    let targetTimestamp = timestamp;

    if (!targetTimestamp) {
      const latestQuery = db.prepare(`
        SELECT MAX(timestamp) as latest
        FROM argo_profiles
        WHERE float_id = ?
      `);
      const latest = latestQuery.get(floatId);

      if (!latest || !latest.latest) {
        return {
          success: false,
          error: 'Float not found',
          data: []
        };
      }

      targetTimestamp = latest.latest;
    }

    // Get profile data ordered by depth
    const query = db.prepare(`
      SELECT 
        depth,
        temperature,
        salinity,
        pressure,
        latitude,
        longitude,
        timestamp
      FROM argo_profiles
      WHERE float_id = ? AND timestamp = ?
      ORDER BY depth ASC
    `);

    const results = query.all(floatId, targetTimestamp);

    if (results.length === 0) {
      return {
        success: false,
        error: 'No profile data found',
        data: []
      };
    }

    return {
      success: true,
      data: results,
      metadata: {
        floatId: floatId,
        timestamp: targetTimestamp,
        location: {
          latitude: results[0].latitude,
          longitude: results[0].longitude
        },
        depthLevels: results.length,
        depthRange: {
          min: results[0].depth,
          max: results[results.length - 1].depth
        }
      }
    };
  }

  /**
   * Query 3: Find nearest floats to a location
   * 
   * Returns floats closest to a given coordinate.
   * Uses argo_floats table for efficient lookup.
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.latitude - Target latitude
   * @param {number} params.longitude - Target longitude
   * @param {number} params.radius - Search radius in degrees (default: 5)
   * @param {number} params.limit - Maximum number of results (default: 10)
   */
  static getNearestFloats(params) {
    const {
      latitude,
      longitude,
      radius = 5,
      limit = 10
    } = params;

    const db = argoDb.getDatabase();

    // Simple bounding box search (for PoC, not haversine distance)
    // Production: Use PostGIS or proper distance calculations
    const query = db.prepare(`
      SELECT 
        float_id,
        last_latitude,
        last_longitude,
        first_timestamp,
        last_timestamp,
        total_profiles,
        -- Simple distance estimation (not accurate for large distances)
        ABS(last_latitude - ?) + ABS(last_longitude - ?) as approx_distance
      FROM argo_floats
      WHERE last_latitude BETWEEN ? AND ?
        AND last_longitude BETWEEN ? AND ?
      ORDER BY approx_distance ASC
      LIMIT ?
    `);

    const results = query.all(
      latitude, longitude,
      latitude - radius, latitude + radius,
      longitude - radius, longitude + radius,
      limit
    );

    return {
      success: true,
      data: results,
      metadata: {
        searchLocation: { latitude, longitude },
        radius: radius,
        count: results.length
      }
    };
  }

  /**
   * Query 4: Get float metadata
   * 
   * Returns metadata for a specific float.
   * 
   * @param {number} floatId - Float identifier
   */
  static getFloatMetadata(floatId) {
    const db = argoDb.getDatabase();

    const query = db.prepare(`
      SELECT 
        float_id,
        first_timestamp,
        last_timestamp,
        last_latitude,
        last_longitude,
        total_profiles
      FROM argo_floats
      WHERE float_id = ?
    `);

    const result = query.get(floatId);

    if (!result) {
      return {
        success: false,
        error: 'Float not found'
      };
    }

    return {
      success: true,
      data: result
    };
  }

  /**
   * Query 5: Get database statistics
   * 
   * Returns overall database statistics for monitoring.
   */
  static getDatabaseStats() {
    const db = argoDb.getDatabase();

    const profileCount = db.prepare('SELECT COUNT(*) as count FROM argo_profiles').get();
    const floatCount = db.prepare('SELECT COUNT(*) as count FROM argo_floats').get();

    const bounds = db.prepare(`
      SELECT 
        MIN(latitude) as minLat,
        MAX(latitude) as maxLat,
        MIN(longitude) as minLon,
        MAX(longitude) as maxLon,
        MIN(timestamp) as minTime,
        MAX(timestamp) as maxTime
      FROM argo_profiles
    `).get();

    return {
      success: true,
      data: {
        totalProfiles: profileCount.count,
        totalFloats: floatCount.count,
        geographicBounds: {
          latitude: { min: bounds.minLat, max: bounds.maxLat },
          longitude: { min: bounds.minLon, max: bounds.maxLon }
        },
        temporalBounds: {
          start: bounds.minTime,
          end: bounds.maxTime
        }
      }
    };
  }

  /**
   * CATEGORY 4: Data Availability & Coverage
   * Query 6: Check data availability in region
   * 
   * Returns availability information without full data retrieval.
   * Answers: "Is there data here?"
   * 
   * @param {Object} params - Query parameters
   */
  static checkDataAvailability(params) {
    const {
      latMin,
      latMax,
      lonMin,
      lonMax,
      timeStart,
      timeEnd
    } = params;

    const db = argoDb.getDatabase();

    // Count profiles in region
    const countQuery = db.prepare(`
      SELECT COUNT(*) as profileCount
      FROM argo_profiles
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND timestamp BETWEEN ? AND ?
    `);

    const countResult = countQuery.get(
      latMin, latMax,
      lonMin, lonMax,
      timeStart, timeEnd
    );

    // Count unique floats in region
    const floatsQuery = db.prepare(`
      SELECT COUNT(DISTINCT float_id) as floatCount
      FROM argo_profiles
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND timestamp BETWEEN ? AND ?
    `);

    const floatsResult = floatsQuery.get(
      latMin, latMax,
      lonMin, lonMax,
      timeStart, timeEnd
    );

    // Get date range with data
    const dateRangeQuery = db.prepare(`
      SELECT 
        MIN(timestamp) as firstDate,
        MAX(timestamp) as lastDate,
        COUNT(DISTINCT DATE(timestamp)) as uniqueDays
      FROM argo_profiles
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND timestamp BETWEEN ? AND ?
    `);

    const dateRangeResult = dateRangeQuery.get(
      latMin, latMax,
      lonMin, lonMax,
      timeStart, timeEnd
    );

    const hasData = countResult.profileCount > 0;

    return {
      success: true,
      data: {
        hasData,
        profileCount: countResult.profileCount,
        floatCount: floatsResult.floatCount,
        dateRange: hasData ? {
          first: dateRangeResult.firstDate,
          last: dateRangeResult.lastDate,
          uniqueDays: dateRangeResult.uniqueDays
        } : null,
        queriedRegion: {
          latitude: { min: latMin, max: latMax },
          longitude: { min: lonMin, max: lonMax },
          time: { start: timeStart, end: timeEnd }
        }
      }
    };
  }

  /**
   * CATEGORY 4: Data Availability & Coverage
   * Query 7: Get active floats in time window
   * 
   * Returns which floats were active during a specific period.
   * Answers: "Which floats were active during this time?"
   */
  static getActiveFloats(params) {
    const { timeStart, timeEnd, latMin, latMax, lonMin, lonMax } = params;
    const db = argoDb.getDatabase();

    let query;
    let queryParams;

    if (latMin !== undefined && lonMin !== undefined) {
      // Region-specific active floats
      query = db.prepare(`
        SELECT DISTINCT
          p.float_id,
          f.first_timestamp,
          f.last_timestamp,
          f.last_latitude,
          f.last_longitude,
          COUNT(DISTINCT DATE(p.timestamp)) as activeDays
        FROM argo_profiles p
        JOIN argo_floats f ON p.float_id = f.float_id
        WHERE p.timestamp BETWEEN ? AND ?
          AND p.latitude BETWEEN ? AND ?
          AND p.longitude BETWEEN ? AND ?
        GROUP BY p.float_id
        ORDER BY activeDays DESC
      `);
      queryParams = [timeStart, timeEnd, latMin, latMax, lonMin, lonMax];
    } else {
      // All active floats in time window
      query = db.prepare(`
        SELECT DISTINCT
          p.float_id,
          f.first_timestamp,
          f.last_timestamp,
          f.last_latitude,
          f.last_longitude,
          COUNT(DISTINCT DATE(p.timestamp)) as activeDays
        FROM argo_profiles p
        JOIN argo_floats f ON p.float_id = f.float_id
        WHERE p.timestamp BETWEEN ? AND ?
        GROUP BY p.float_id
        ORDER BY activeDays DESC
      `);
      queryParams = [timeStart, timeEnd];
    }

    const results = query.all(...queryParams);

    return {
      success: true,
      data: results,
      metadata: {
        count: results.length,
        timeWindow: { start: timeStart, end: timeEnd }
      }
    };
  }

  /**
   * CATEGORY 5: Simple Aggregations (Non-Interpretive)
   * Query 8: Get regional statistics
   * 
   * Returns mathematical summaries (min/max/avg) without interpretation.
   * Answers: "What are the numbers like?"
   * 
   * @param {Object} params - Query parameters
   */
  static getRegionalStatistics(params) {
    const {
      latMin,
      latMax,
      lonMin,
      lonMax,
      timeStart,
      timeEnd,
      variable = 'temperature' // or 'salinity'
    } = params;

    const db = argoDb.getDatabase();

    // Validate variable
    if (!['temperature', 'salinity'].includes(variable)) {
      return {
        success: false,
        error: 'Variable must be "temperature" or "salinity"'
      };
    }

    // Calculate statistics
    const statsQuery = db.prepare(`
      SELECT 
        COUNT(*) as sampleCount,
        MIN(${variable}) as minValue,
        MAX(${variable}) as maxValue,
        AVG(${variable}) as avgValue,
        MIN(depth) as minDepth,
        MAX(depth) as maxDepth,
        COUNT(DISTINCT float_id) as floatCount
      FROM argo_profiles
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND timestamp BETWEEN ? AND ?
        AND ${variable} IS NOT NULL
    `);

    const stats = statsQuery.get(
      latMin, latMax,
      lonMin, lonMax,
      timeStart, timeEnd
    );

    // Depth-wise statistics (optional, for understanding vertical distribution)
    const depthBinsQuery = db.prepare(`
      SELECT 
        CASE 
          WHEN depth < 100 THEN '0-100m'
          WHEN depth < 500 THEN '100-500m'
          WHEN depth < 1000 THEN '500-1000m'
          ELSE '1000m+'
        END as depthBin,
        COUNT(*) as count,
        AVG(${variable}) as avgValue
      FROM argo_profiles
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND timestamp BETWEEN ? AND ?
        AND ${variable} IS NOT NULL
      GROUP BY depthBin
      ORDER BY MIN(depth)
    `);

    const depthBins = depthBinsQuery.all(
      latMin, latMax,
      lonMin, lonMax,
      timeStart, timeEnd
    );

    return {
      success: true,
      data: {
        variable,
        statistics: {
          count: stats.sampleCount,
          min: stats.minValue,
          max: stats.maxValue,
          mean: stats.avgValue,
          range: stats.maxValue - stats.minValue
        },
        coverage: {
          depthRange: {
            min: stats.minDepth,
            max: stats.maxDepth
          },
          floatCount: stats.floatCount
        },
        depthDistribution: depthBins
      },
      metadata: {
        region: {
          latitude: { min: latMin, max: latMax },
          longitude: { min: lonMin, max: lonMax }
        },
        timeWindow: { start: timeStart, end: timeEnd }
      }
    };
  }

  /**
   * Helper: Calculate metadata from results
   */
  static _calculateMetadata(results) {
    if (results.length === 0) {
      return {};
    }

    const uniqueFloats = new Set(results.map(r => r.float_id)).size;
    const depths = results.map(r => r.depth);
    const temps = results.map(r => r.temperature).filter(t => t !== null);
    const salts = results.map(r => r.salinity).filter(s => s !== null);

    return {
      uniqueFloats,
      depthRange: {
        min: Math.min(...depths),
        max: Math.max(...depths)
      },
      temperatureRange: temps.length > 0 ? {
        min: Math.min(...temps),
        max: Math.max(...temps)
      } : null,
      salinityRange: salts.length > 0 ? {
        min: Math.min(...salts),
        max: Math.max(...salts)
      } : null
    };
  }

  /**
   * Query 9: Count floats and profiles in bounding box (cheap pre-filter)
   * 
   * Used by dynamic radius service to quickly assess data density.
   * This is optimized for speed - no data retrieval, just counts.
   * 
   * @param {Object} bbox - { latMin, latMax, lonMin, lonMax }
   * @param {Object} timeRange - Optional { start, end }
   * @returns {Object} { floatCount, profileCount }
   */
  static countFloatsInBbox(bbox, timeRange = null) {
    const { latMin, latMax, lonMin, lonMax } = bbox;
    const db = argoDb.getDatabase();

    let query;
    let params;

    if (timeRange && timeRange.start && timeRange.end) {
      query = db.prepare(`
        SELECT 
          COUNT(DISTINCT float_id) as floatCount,
          COUNT(*) as profileCount
        FROM argo_profiles
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
          AND timestamp BETWEEN ? AND ?
      `);
      params = [latMin, latMax, lonMin, lonMax, timeRange.start, timeRange.end];
    } else {
      query = db.prepare(`
        SELECT 
          COUNT(DISTINCT float_id) as floatCount,
          COUNT(*) as profileCount
        FROM argo_profiles
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
      `);
      params = [latMin, latMax, lonMin, lonMax];
    }

    const result = query.get(...params);

    return {
      floatCount: result.floatCount || 0,
      profileCount: result.profileCount || 0
    };
  }

  /**
   * Query 10: Get floats near a landmark with adaptive filtering
   * 
   * Two-phase approach for performance:
   * 1. Bounding box pre-filter (fast, removes ~80-90% of data)
   * 2. Haversine distance filter (precise, on reduced set)
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.centerLat - Center latitude
   * @param {number} params.centerLon - Center longitude
   * @param {number} params.radiusKm - Search radius in kilometers
   * @param {Object} params.timeRange - Optional { start, end }
   * @param {number} params.limit - Maximum results (default: 1000)
   * @returns {Object} Result with floats and spatial metadata
   */
  static getNearbyFloatsFromLandmark(params) {
    const {
      centerLat,
      centerLon,
      radiusKm,
      timeRange = null,
      limit = 1000
    } = params;

    const db = argoDb.getDatabase();

    // Convert km to degrees for bounding box (approximate)
    const KM_PER_DEGREE_LAT = 111.32;
    const KM_PER_DEGREE_LON = 111.32 * Math.cos(centerLat * Math.PI / 180);

    const latDelta = radiusKm / KM_PER_DEGREE_LAT;
    const lonDelta = radiusKm / KM_PER_DEGREE_LON;

    const bbox = {
      latMin: centerLat - latDelta,
      latMax: centerLat + latDelta,
      lonMin: centerLon - lonDelta,
      lonMax: centerLon + lonDelta
    };

    console.log(`[ArgoDataService] Landmark search: center=(${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}), radius=${radiusKm}km, bbox delta=(${latDelta.toFixed(3)}, ${lonDelta.toFixed(3)})`);

    // Phase 1: Bounding box pre-filter (cheap)
    let query;
    let queryParams;

    if (timeRange && timeRange.start && timeRange.end) {
      query = db.prepare(`
        SELECT DISTINCT
          f.float_id,
          f.last_latitude as latitude,
          f.last_longitude as longitude,
          f.first_timestamp,
          f.last_timestamp,
          f.total_profiles
        FROM argo_floats f
        WHERE f.last_latitude BETWEEN ? AND ?
          AND f.last_longitude BETWEEN ? AND ?
          AND f.last_timestamp >= ?
          AND f.first_timestamp <= ?
        ORDER BY f.total_profiles DESC
        LIMIT ?
      `);
      queryParams = [
        bbox.latMin, bbox.latMax,
        bbox.lonMin, bbox.lonMax,
        timeRange.start, timeRange.end,
        limit * 2 // Fetch more for precise filtering
      ];
    } else {
      query = db.prepare(`
        SELECT 
          float_id,
          last_latitude as latitude,
          last_longitude as longitude,
          first_timestamp,
          last_timestamp,
          total_profiles
        FROM argo_floats
        WHERE last_latitude BETWEEN ? AND ?
          AND last_longitude BETWEEN ? AND ?
        ORDER BY total_profiles DESC
        LIMIT ?
      `);
      queryParams = [
        bbox.latMin, bbox.latMax,
        bbox.lonMin, bbox.lonMax,
        limit * 2
      ];
    }

    const preFilteredResults = query.all(...queryParams);
    console.log(`[ArgoDataService] Bbox pre-filter: ${preFilteredResults.length} candidates`);

    // Phase 2: Haversine distance filter (precise)
    const R = 6371; // Earth radius in km
    const toRad = (deg) => deg * Math.PI / 180;

    const resultsWithDistance = preFilteredResults
      .map(row => {
        const dLat = toRad(row.latitude - centerLat);
        const dLon = toRad(row.longitude - centerLon);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(centerLat)) * Math.cos(toRad(row.latitude)) *
          Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        return {
          ...row,
          distanceKm: Math.round(distanceKm * 10) / 10
        };
      })
      .filter(row => row.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    console.log(`[ArgoDataService] Haversine filter: ${resultsWithDistance.length} within ${radiusKm}km`);

    return {
      success: true,
      data: resultsWithDistance,
      metadata: {
        count: resultsWithDistance.length,
        searchCenter: { latitude: centerLat, longitude: centerLon },
        radiusKm: radiusKm,
        bbox: bbox,
        preFilterCount: preFilteredResults.length,
        timeRange: timeRange
      }
    };
  }
}

// Export the appropriate service based on database mode
const { USE_SUPABASE } = require('../config/database');

if (USE_SUPABASE) {
  // Use async Supabase REST API version for production
  const ArgoDataServiceSupabase = require('./argoDataServiceSupabase');
  module.exports = ArgoDataServiceSupabase;
} else {
  // Use synchronous SQLite version for local development
  module.exports = ArgoDataService;
}
