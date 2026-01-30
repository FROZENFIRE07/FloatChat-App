/**
 * Supabase REST API Client
 * 
 * Uses Supabase JavaScript SDK which communicates via HTTPS REST API.
 * This works reliably across all cloud providers (no PostgreSQL direct connection needed).
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseArgoDatabase {
    constructor() {
        this.supabase = null;
        this.connected = false;
    }

    async connect() {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
            }

            console.log('📊 Connecting to ARGO database via Supabase REST API...');
            console.log(`   URL: ${supabaseUrl}`);

            this.supabase = createClient(supabaseUrl, supabaseKey);

            // Test connection by fetching a single row
            const { data, error } = await this.supabase
                .from('argo_profiles')
                .select('id')
                .limit(1);

            if (error) {
                throw new Error(`Supabase connection test failed: ${error.message}`);
            }

            // Check both tables exist
            const { data: floatsData, error: floatsError } = await this.supabase
                .from('argo_floats')
                .select('float_id')
                .limit(1);

            if (floatsError) {
                throw new Error(`argo_floats table check failed: ${floatsError.message}`);
            }

            this.connected = true;
            console.log('✅ Supabase REST API connected successfully');
            console.log('   Tables: argo_profiles, argo_floats');

            return this;
        } catch (error) {
            console.error('❌ Failed to connect to Supabase:', error.message);
            throw error;
        }
    }

    getDatabase() {
        if (!this.connected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this;
    }

    getClient() {
        return this.supabase;
    }

    /**
     * Query argo_profiles with filters
     * Returns rows matching the criteria
     */
    async queryProfiles(params) {
        const {
            latMin, latMax, lonMin, lonMax,
            timeStart, timeEnd,
            limit = 1000,
            floatId = null
        } = params;

        let query = this.supabase
            .from('argo_profiles')
            .select('id, float_id, timestamp, latitude, longitude, depth, temperature, salinity, pressure');

        // Apply filters
        if (latMin !== undefined && latMax !== undefined) {
            query = query.gte('latitude', latMin).lte('latitude', latMax);
        }
        if (lonMin !== undefined && lonMax !== undefined) {
            query = query.gte('longitude', lonMin).lte('longitude', lonMax);
        }
        if (timeStart && timeEnd) {
            query = query.gte('timestamp', timeStart).lte('timestamp', timeEnd);
        }
        if (floatId) {
            query = query.eq('float_id', floatId);
        }

        query = query.order('timestamp', { ascending: false })
            .order('depth', { ascending: true })
            .limit(limit);

        const { data, error } = await query;

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Query argo_floats with filters
     */
    async queryFloats(params) {
        const { latMin, latMax, lonMin, lonMax, limit = 100 } = params;

        let query = this.supabase
            .from('argo_floats')
            .select('float_id, first_timestamp, last_timestamp, last_latitude, last_longitude, total_profiles');

        if (latMin !== undefined && latMax !== undefined) {
            query = query.gte('last_latitude', latMin).lte('last_latitude', latMax);
        }
        if (lonMin !== undefined && lonMax !== undefined) {
            query = query.gte('last_longitude', lonMin).lte('last_longitude', lonMax);
        }

        query = query.limit(limit);

        const { data, error } = await query;

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Get counts for data availability checks
     */
    async getCounts(params) {
        const { latMin, latMax, lonMin, lonMax, timeStart, timeEnd } = params;

        let query = this.supabase
            .from('argo_profiles')
            .select('id', { count: 'exact', head: true });

        if (latMin !== undefined) {
            query = query.gte('latitude', latMin).lte('latitude', latMax);
        }
        if (lonMin !== undefined) {
            query = query.gte('longitude', lonMin).lte('longitude', lonMax);
        }
        if (timeStart && timeEnd) {
            query = query.gte('timestamp', timeStart).lte('timestamp', timeEnd);
        }

        const { count, error } = await query;

        if (error) {
            throw new Error(`Count query failed: ${error.message}`);
        }

        return count || 0;
    }

    async healthCheck() {
        try {
            const { count, error } = await this.supabase
                .from('argo_profiles')
                .select('id', { count: 'exact', head: true });

            if (error) throw error;

            return {
                status: 'healthy',
                type: 'supabase-rest',
                profileCount: count
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                type: 'supabase-rest',
                error: error.message
            };
        }
    }

    async close() {
        this.connected = false;
        console.log('📊 Supabase connection closed');
    }
}

module.exports = SupabaseArgoDatabase;
