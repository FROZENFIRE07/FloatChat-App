/**
 * ARGO Data Service (Supabase REST API Version)
 * 
 * Module 3: Backend Query Layer
 * 
 * This service provides deterministic data access to ARGO ocean data
 * using Supabase REST API instead of direct SQL.
 * 
 * Rules:
 * - No AI, no interpretation, no inference
 * - Validated inputs only
 * - Structured JSON outputs
 * - All queries are deterministic
 */

const { argoDb, USE_SUPABASE } = require('../config/database');

class ArgoDataServiceSupabase {
    /**
     * Query 1: Get data by region and time
     * Implements pagination to overcome Supabase's 1000 row limit
     */
    static async getRegionData(params) {
        const {
            latMin, latMax, lonMin, lonMax,
            timeStart, timeEnd,
            limit = 1000,
            centroid = null,
            radiusKm = null
        } = params;

        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        // Supabase has a 1000 row limit per request, so we need pagination
        const BATCH_SIZE = 1000;
        const maxRows = Math.min(limit, 10000); // Cap at 10k for reasonable load times
        let allResults = [];
        let offset = 0;
        let hasMore = true;

        console.log(`[ArgoDataServiceSupabase] Fetching up to ${maxRows} rows with pagination...`);

        while (hasMore && allResults.length < maxRows) {
            const { data: results, error } = await supabase
                .from('argo_profiles')
                .select('float_id, timestamp, latitude, longitude, depth, temperature, salinity, pressure')
                .gte('latitude', latMin)
                .lte('latitude', latMax)
                .gte('longitude', lonMin)
                .lte('longitude', lonMax)
                .gte('timestamp', timeStart)
                .lte('timestamp', timeEnd)
                .order('timestamp', { ascending: false })
                .order('depth', { ascending: true })
                .range(offset, offset + BATCH_SIZE - 1);

            if (error) {
                throw new Error(`Query failed: ${error.message}`);
            }

            if (!results || results.length === 0) {
                hasMore = false;
            } else {
                allResults = allResults.concat(results);
                offset += BATCH_SIZE;
                hasMore = results.length === BATCH_SIZE;
                console.log(`[ArgoDataServiceSupabase] Fetched batch: ${results.length} rows, total: ${allResults.length}`);
            }
        }

        // Normalize longitude (0-360 → -180...+180)
        let normalizedResults = allResults.map(row => ({
            ...row,
            longitude: row.longitude > 180 ? row.longitude - 360 : row.longitude
        }));

        // Haversine post-filter for circular queries
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

            console.log(`[ArgoDataService] 🎯 Haversine filter: ${beforeCount} → ${normalizedResults.length} (within ${radiusKm}km)`);
        }

        // Calculate metadata
        const metadata = this._calculateMetadata(normalizedResults);

        console.log(`[ArgoDataServiceSupabase] ✅ Final result: ${normalizedResults.length} profiles from ${metadata.uniqueFloats || 0} floats`);

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
     */
    static async getVerticalProfile(params) {
        const { floatId, timestamp } = params;
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        let targetTimestamp = timestamp;

        if (!targetTimestamp) {
            // Get latest timestamp for this float
            const { data: latest } = await supabase
                .from('argo_profiles')
                .select('timestamp')
                .eq('float_id', floatId)
                .order('timestamp', { ascending: false })
                .limit(1);

            if (!latest || latest.length === 0) {
                return { success: false, error: 'Float not found', data: [] };
            }
            targetTimestamp = latest[0].timestamp;
        }

        const { data: results, error } = await supabase
            .from('argo_profiles')
            .select('depth, temperature, salinity, pressure, latitude, longitude, timestamp')
            .eq('float_id', floatId)
            .eq('timestamp', targetTimestamp)
            .order('depth', { ascending: true });

        if (error || !results || results.length === 0) {
            return { success: false, error: 'No profile data found', data: [] };
        }

        return {
            success: true,
            data: results,
            metadata: {
                floatId,
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
     */
    static async getNearestFloats(params) {
        const { latitude, longitude, radius = 5, limit = 10 } = params;
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        const { data: results, error } = await supabase
            .from('argo_floats')
            .select('float_id, last_latitude, last_longitude, first_timestamp, last_timestamp, total_profiles')
            .gte('last_latitude', latitude - radius)
            .lte('last_latitude', latitude + radius)
            .gte('last_longitude', longitude - radius)
            .lte('last_longitude', longitude + radius)
            .limit(limit);

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        // Add approximate distance and sort
        const resultsWithDistance = (results || []).map(r => ({
            ...r,
            approx_distance: Math.abs(r.last_latitude - latitude) + Math.abs(r.last_longitude - longitude)
        })).sort((a, b) => a.approx_distance - b.approx_distance);

        return {
            success: true,
            data: resultsWithDistance,
            metadata: {
                searchLocation: { latitude, longitude },
                radius,
                count: resultsWithDistance.length
            }
        };
    }

    /**
     * Query 4: Get float metadata
     */
    static async getFloatMetadata(floatId) {
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        const { data: result, error } = await supabase
            .from('argo_floats')
            .select('float_id, first_timestamp, last_timestamp, last_latitude, last_longitude, total_profiles')
            .eq('float_id', floatId)
            .single();

        if (error || !result) {
            return { success: false, error: 'Float not found' };
        }

        return { success: true, data: result };
    }

    /**
     * Query 5: Get database statistics
     */
    static async getDatabaseStats() {
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        const { count: profileCount } = await supabase
            .from('argo_profiles')
            .select('id', { count: 'exact', head: true });

        const { count: floatCount } = await supabase
            .from('argo_floats')
            .select('float_id', { count: 'exact', head: true });

        // Get bounds from a sample
        const { data: bounds } = await supabase
            .from('argo_profiles')
            .select('latitude, longitude, timestamp')
            .order('timestamp', { ascending: true })
            .limit(1);

        const { data: boundsMax } = await supabase
            .from('argo_profiles')
            .select('latitude, longitude, timestamp')
            .order('timestamp', { ascending: false })
            .limit(1);

        return {
            success: true,
            data: {
                totalProfiles: profileCount || 0,
                totalFloats: floatCount || 0,
                temporalBounds: {
                    start: bounds?.[0]?.timestamp,
                    end: boundsMax?.[0]?.timestamp
                }
            }
        };
    }

    /**
     * Query 6: Check data availability
     */
    static async checkDataAvailability(params) {
        const { latMin, latMax, lonMin, lonMax, timeStart, timeEnd } = params;
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        const { count: profileCount } = await supabase
            .from('argo_profiles')
            .select('id', { count: 'exact', head: true })
            .gte('latitude', latMin)
            .lte('latitude', latMax)
            .gte('longitude', lonMin)
            .lte('longitude', lonMax)
            .gte('timestamp', timeStart)
            .lte('timestamp', timeEnd);

        const hasData = (profileCount || 0) > 0;

        return {
            success: true,
            data: {
                hasData,
                profileCount: profileCount || 0,
                queriedRegion: {
                    latitude: { min: latMin, max: latMax },
                    longitude: { min: lonMin, max: lonMax },
                    time: { start: timeStart, end: timeEnd }
                }
            }
        };
    }

    /**
     * Query 7: Get active floats in time window
     */
    static async getActiveFloats(params) {
        const { timeStart, timeEnd, latMin, latMax, lonMin, lonMax } = params;
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        let query = supabase
            .from('argo_floats')
            .select('float_id, first_timestamp, last_timestamp, last_latitude, last_longitude, total_profiles')
            .lte('first_timestamp', timeEnd)
            .gte('last_timestamp', timeStart);

        if (latMin !== undefined && lonMin !== undefined) {
            query = query
                .gte('last_latitude', latMin)
                .lte('last_latitude', latMax)
                .gte('last_longitude', lonMin)
                .lte('last_longitude', lonMax);
        }

        const { data: results, error } = await query;

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        return {
            success: true,
            data: results || [],
            metadata: {
                count: (results || []).length,
                timeWindow: { start: timeStart, end: timeEnd }
            }
        };
    }

    /**
     * Query 8: Get regional statistics
     */
    static async getRegionalStatistics(params) {
        const { latMin, latMax, lonMin, lonMax, timeStart, timeEnd, variable = 'temperature' } = params;

        if (!['temperature', 'salinity'].includes(variable)) {
            return { success: false, error: 'Variable must be "temperature" or "salinity"' };
        }

        // Get data and calculate stats in-memory (Supabase doesn't support aggregations well)
        const result = await this.getRegionData({
            latMin, latMax, lonMin, lonMax, timeStart, timeEnd, limit: 5000
        });

        if (!result.success || result.data.length === 0) {
            return {
                success: true,
                data: {
                    variable,
                    statistics: { count: 0, min: null, max: null, mean: null, range: null },
                    coverage: { depthRange: { min: null, max: null }, floatCount: 0 }
                }
            };
        }

        const values = result.data.map(r => r[variable]).filter(v => v !== null);
        const depths = result.data.map(r => r.depth);
        const floatIds = new Set(result.data.map(r => r.float_id));

        return {
            success: true,
            data: {
                variable,
                statistics: {
                    count: values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    mean: values.reduce((a, b) => a + b, 0) / values.length,
                    range: Math.max(...values) - Math.min(...values)
                },
                coverage: {
                    depthRange: { min: Math.min(...depths), max: Math.max(...depths) },
                    floatCount: floatIds.size
                }
            },
            metadata: {
                region: { latitude: { min: latMin, max: latMax }, longitude: { min: lonMin, max: lonMax } },
                timeWindow: { start: timeStart, end: timeEnd }
            }
        };
    }

    /**
     * Query 9: Count floats in bounding box
     */
    static async countFloatsInBbox(bbox, timeRange = null) {
        const { latMin, latMax, lonMin, lonMax } = bbox;
        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        let query = supabase
            .from('argo_profiles')
            .select('id', { count: 'exact', head: true })
            .gte('latitude', latMin)
            .lte('latitude', latMax)
            .gte('longitude', lonMin)
            .lte('longitude', lonMax);

        if (timeRange && timeRange.start && timeRange.end) {
            query = query.gte('timestamp', timeRange.start).lte('timestamp', timeRange.end);
        }

        const { count: profileCount } = await query;

        return {
            floatCount: 0, // Would need separate query
            profileCount: profileCount || 0
        };
    }

    /**
     * Query 10: Get floats near a landmark
     */
    static async getNearbyFloatsFromLandmark(params) {
        const { centerLat, centerLon, radiusKm, timeRange = null, limit = 1000 } = params;

        // Convert km to degrees for bounding box
        const KM_PER_DEGREE_LAT = 111.32;
        const KM_PER_DEGREE_LON = 111.32 * Math.cos(centerLat * Math.PI / 180);

        const latDelta = radiusKm / KM_PER_DEGREE_LAT;
        const lonDelta = radiusKm / KM_PER_DEGREE_LON;

        const db = argoDb.getDatabase();
        const supabase = db.getClient();

        let query = supabase
            .from('argo_floats')
            .select('float_id, last_latitude, last_longitude, first_timestamp, last_timestamp, total_profiles')
            .gte('last_latitude', centerLat - latDelta)
            .lte('last_latitude', centerLat + latDelta)
            .gte('last_longitude', centerLon - lonDelta)
            .lte('last_longitude', centerLon + lonDelta)
            .limit(limit * 2);

        if (timeRange && timeRange.start && timeRange.end) {
            query = query.gte('last_timestamp', timeRange.start).lte('first_timestamp', timeRange.end);
        }

        const { data: results, error } = await query;

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        // Haversine filter
        const EARTH_RADIUS_KM = 6371;
        const toRad = (deg) => deg * Math.PI / 180;

        const filteredResults = (results || []).filter(row => {
            const dLat = toRad(row.last_latitude - centerLat);
            const dLon = toRad(row.last_longitude - centerLon);
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(centerLat)) * Math.cos(toRad(row.last_latitude)) *
                Math.sin(dLon / 2) ** 2;
            const distance = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return distance <= radiusKm;
        }).slice(0, limit).map(row => ({
            ...row,
            latitude: row.last_latitude,
            longitude: row.last_longitude
        }));

        return {
            success: true,
            data: filteredResults,
            metadata: {
                center: { lat: centerLat, lon: centerLon },
                radiusKm,
                count: filteredResults.length
            }
        };
    }

    /**
     * Helper: Calculate metadata from results
     */
    static _calculateMetadata(results) {
        if (results.length === 0) return {};

        const uniqueFloats = new Set(results.map(r => r.float_id)).size;
        const depths = results.map(r => r.depth);
        const temps = results.map(r => r.temperature).filter(t => t !== null);
        const salts = results.map(r => r.salinity).filter(s => s !== null);

        return {
            uniqueFloats,
            depthRange: { min: Math.min(...depths), max: Math.max(...depths) },
            temperatureRange: temps.length > 0 ? { min: Math.min(...temps), max: Math.max(...temps) } : null,
            salinityRange: salts.length > 0 ? { min: Math.min(...salts), max: Math.max(...salts) } : null
        };
    }
}

module.exports = ArgoDataServiceSupabase;
