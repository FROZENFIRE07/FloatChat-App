#!/usr/bin/env node

/**
 * Geocoding & Spatial Reasoning Test Script
 * 
 * Tests the new spatial reasoning system:
 * - Geocoding service with Nominatim
 * - Cache persistence
 * - Dynamic radius service
 * - Bounding box pre-filtering
 * 
 * Usage:
 *   node test-geocoding.js
 */

const geocodingService = require('./src/services/geocodingService');
const spatialResolver = require('./src/services/spatialResolver');
const { dynamicRadiusService, haversineDistance, createBoundingBox } = require('./src/services/dynamicRadiusService');

let passCount = 0;
let failCount = 0;

async function test(name, testFn) {
    try {
        console.log(`\n🧪 Testing: ${name}`);
        await testFn();
        console.log(`   ✅ PASS`);
        passCount++;
    } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
        failCount++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('FloatChat Spatial Reasoning Test Suite');
    console.log('='.repeat(60));

    // Initialize services
    console.log('\n📦 Initializing services...');
    await geocodingService.init();
    await spatialResolver.init();

    // ==========================================
    // 1. Geocoding Service Tests
    // ==========================================
    console.log('\n--- Geocoding Service Tests ---');

    await test('Geocoding: Resolve Mumbai', async () => {
        const result = await geocodingService.resolveLandmark('Mumbai');
        assert(result !== null, 'Result should not be null');
        assert(result.lat > 18 && result.lat < 20, `Latitude should be ~19, got ${result.lat}`);
        assert(result.lon > 72 && result.lon < 74, `Longitude should be ~73, got ${result.lon}`);
        console.log(`   Location: ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`);
        console.log(`   Display: ${result.displayName}`);
    });

    await test('Geocoding: Cache hit for Mumbai (second call)', async () => {
        const start = Date.now();
        const result = await geocodingService.resolveLandmark('Mumbai');
        const elapsed = Date.now() - start;
        assert(result !== null, 'Result should not be null');
        assert(elapsed < 100, `Should be instant from cache, took ${elapsed}ms`);
        console.log(`   Elapsed: ${elapsed}ms (cached)`);
    });

    await test('Geocoding: Ambiguity check for generic terms', async () => {
        const ambiguity = geocodingService.checkAmbiguity('port');
        assert(ambiguity.ambiguous === true, 'Generic term "port" should be ambiguous');
        console.log(`   Reason: ${ambiguity.reason}`);
    });

    await test('Geocoding: Ambiguity check for specific location', async () => {
        const ambiguity = geocodingService.checkAmbiguity('Mumbai');
        assert(ambiguity.ambiguous === false, '"Mumbai" should not be ambiguous');
    });

    // ==========================================
    // 2. Spatial Resolver Tests
    // ==========================================
    console.log('\n--- Spatial Resolver Tests ---');

    await test('SpatialResolver: Resolve Arabian Sea (GeoJSON)', async () => {
        const result = spatialResolver.resolve('Arabian Sea');
        assert(result !== null, 'Result should not be null');
        assert(result.latMin < result.latMax, 'latMin should be < latMax');
        assert(result.lonMin < result.lonMax, 'lonMin should be < lonMax');
        console.log(`   Bbox: lat[${result.latMin.toFixed(2)}, ${result.latMax.toFixed(2)}] lon[${result.lonMin.toFixed(2)}, ${result.lonMax.toFixed(2)}]`);
    });

    await test('SpatialResolver: resolveWithGeocode for ocean (GeoJSON priority)', async () => {
        const result = await spatialResolver.resolveWithGeocode('Arabian Sea');
        assert(result !== null, 'Result should not be null');
        assert(result.source === 'geojson', `Source should be geojson, got ${result.source}`);
        assert(result.isOceanRegion === true, 'Should be marked as ocean region');
        console.log(`   Source: ${result.source}, isOcean: ${result.isOceanRegion}`);
    });

    await test('SpatialResolver: resolveWithGeocode for city (Nominatim fallback)', async () => {
        const result = await spatialResolver.resolveWithGeocode('Chennai');
        assert(result !== null, 'Result should not be null');
        assert(result.source === 'nominatim', `Source should be nominatim, got ${result.source}`);
        assert(result.isOceanRegion === false, 'Should NOT be marked as ocean region');
        assert(result.centroid !== undefined, 'Should have centroid');
        console.log(`   Source: ${result.source}, centroid: ${result.centroid.lat.toFixed(4)}, ${result.centroid.lon.toFixed(4)}`);
    });

    // ==========================================
    // 3. Dynamic Radius Service Tests
    // ==========================================
    console.log('\n--- Dynamic Radius Service Tests ---');

    await test('Haversine Distance: Mumbai to Delhi', async () => {
        // Mumbai: 19.076, 72.877
        // Delhi: 28.613, 77.209
        const distance = haversineDistance(19.076, 72.877, 28.613, 77.209);
        assert(distance > 1100 && distance < 1200, `Distance should be ~1150km, got ${distance}`);
        console.log(`   Distance: ${distance.toFixed(1)} km`);
    });

    await test('Haversine Distance: Same point', async () => {
        const distance = haversineDistance(19.076, 72.877, 19.076, 72.877);
        assert(distance === 0, `Distance should be 0, got ${distance}`);
    });

    await test('Create Bounding Box: 100km radius', async () => {
        const bbox = createBoundingBox(19.076, 72.877, 100);
        const latDelta = bbox.latMax - bbox.latMin;
        const lonDelta = bbox.lonMax - bbox.lonMin;
        // 100km ≈ 0.9 degrees latitude
        assert(latDelta > 1.5 && latDelta < 2.0, `Lat delta should be ~1.8 degrees, got ${latDelta}`);
        console.log(`   Lat delta: ${latDelta.toFixed(3)}, Lon delta: ${lonDelta.toFixed(3)}`);
    });

    await test('Dynamic Radius: Configuration', async () => {
        const config = dynamicRadiusService.getConfig();
        assert(config.startRadiusKm === 100, 'Start radius should be 100km');
        assert(config.maxRadiusKm === 600, 'Max radius should be 600km');
        assert(config.incrementStepKm === 50, 'Increment should be 50km');
        console.log(`   Config: start=${config.startRadiusKm}km, max=${config.maxRadiusKm}km, step=${config.incrementStepKm}km`);
    });

    // ==========================================
    // 4. Cache Persistence Test
    // ==========================================
    console.log('\n--- Cache Persistence Tests ---');

    await test('Cache: Verify landmarks are cached', async () => {
        const cached = geocodingService.getCachedLandmarks();
        assert(cached.length > 0, 'Cache should have entries');
        console.log(`   Cached landmarks: ${cached.join(', ')}`);
    });

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total:  ${passCount + failCount}`);
    console.log('='.repeat(60));

    if (failCount === 0) {
        console.log('\n🎉 All tests passed! Spatial reasoning system is working correctly.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
});
