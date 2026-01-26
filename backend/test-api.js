#!/usr/bin/env node

/**
 * API Test Script
 * 
 * Tests all Module 3 endpoints to verify functionality
 * 
 * Usage:
 *   node test-api.js
 * 
 * Requires: Backend running on http://localhost:5000
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api/v1';
const TESTS = [];
let passCount = 0;
let failCount = 0;

// Simple HTTP GET helper
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, error: 'Invalid JSON' });
        }
      });
    }).on('error', reject);
  });
}

// Test runner
async function runTest(name, url, validator) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const result = await httpGet(url);
    
    console.log(`   Status: ${result.status}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (validator) {
      validator(result);
    }
    
    console.log(`   ✅ PASS`);
    passCount++;
    return result;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    failCount++;
    return null;
  }
}

// Validators
const validators = {
  healthCheck: (result) => {
    if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
    if (!result.data.success) throw new Error('Success should be true');
    if (result.data.status !== 'healthy') throw new Error('Status should be healthy');
  },
  
  stats: (result) => {
    if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
    if (!result.data.success) throw new Error('Success should be true');
    if (!result.data.data.totalProfiles) throw new Error('Missing totalProfiles');
    if (!result.data.data.totalFloats) throw new Error('Missing totalFloats');
  },
  
  regionQuery: (result) => {
    if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
    if (!result.data.success) throw new Error('Success should be true');
    if (!Array.isArray(result.data.data)) throw new Error('Data should be an array');
    if (!result.data.metadata) throw new Error('Missing metadata');
  },
  
  nearestFloats: (result) => {
    if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
    if (!result.data.success) throw new Error('Success should be true');
    if (!Array.isArray(result.data.data)) throw new Error('Data should be an array');
  }
};

// Main test suite
async function runTests() {
  console.log('='.repeat(60));
  console.log('FloatChat Backend API Test Suite');
  console.log('Module 3: Backend Query Layer');
  console.log('='.repeat(60));
  
  // Test 1: Health Check
  await runTest(
    'Health Check',
    `${API_BASE}/health`,
    validators.healthCheck
  );
  
  // Test 2: ARGO Database Health
  await runTest(
    'ARGO Database Health',
    `${API_BASE}/health/argo`,
    (result) => {
      if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
      if (result.data.status !== 'healthy') throw new Error('ARGO DB should be healthy');
    }
  );
  
  // Test 3: MongoDB Health
  await runTest(
    'MongoDB Health',
    `${API_BASE}/health/mongo`,
    (result) => {
      if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
    }
  );
  
  // Test 4: Database Statistics
  const statsResult = await runTest(
    'Database Statistics',
    `${API_BASE}/argo/stats`,
    validators.stats
  );
  
  // Test 5: Region Query (basic)
  await runTest(
    'Region Query (Basic)',
    `${API_BASE}/argo/region?latMin=-10&latMax=0&lonMin=60&lonMax=80&timeStart=2019-01-01T00:00:00Z&timeEnd=2019-01-31T23:59:59Z&limit=10`,
    validators.regionQuery
  );
  
  // Test 6: Region Query (with limit)
  await runTest(
    'Region Query (With Limit)',
    `${API_BASE}/argo/region?latMin=-50&latMax=30&lonMin=20&lonMax=147&timeStart=2019-01-01T00:00:00Z&timeEnd=2019-01-31T23:59:59Z&limit=5`,
    validators.regionQuery
  );
  
  // Test 7: Nearest Floats
  await runTest(
    'Nearest Floats',
    `${API_BASE}/argo/nearest?latitude=0&longitude=70&radius=10&limit=5`,
    validators.nearestFloats
  );
  
  // Test 8: Vertical Profile (if we have a float ID)
  if (statsResult && statsResult.data.data.totalFloats > 0) {
    // Get a float ID from nearest floats query
    const nearestResult = await httpGet(`${API_BASE}/argo/nearest?latitude=0&longitude=70&radius=50&limit=1`);
    
    if (nearestResult.data && nearestResult.data.data.length > 0) {
      const floatId = nearestResult.data.data[0].float_id;
      
      await runTest(
        'Vertical Profile',
        `${API_BASE}/argo/profile/${floatId}`,
        (result) => {
          if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
          if (!result.data.success) throw new Error('Success should be true');
          if (!Array.isArray(result.data.data)) throw new Error('Data should be an array');
          if (!result.data.metadata) throw new Error('Missing metadata');
          if (!result.data.metadata.floatId) throw new Error('Missing floatId in metadata');
        }
      );
      
      // Test 9: Float Metadata
      await runTest(
        'Float Metadata',
        `${API_BASE}/argo/float/${floatId}`,
        (result) => {
          if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
          if (!result.data.success) throw new Error('Success should be true');
          if (!result.data.data) throw new Error('Missing data');
        }
      );
    }
  }
  
  // Test 10: Invalid Input Handling
  await runTest(
    'Invalid Input (Missing Required Params)',
    `${API_BASE}/argo/region?latMin=-10`,
    (result) => {
      if (result.status !== 400) throw new Error(`Expected 400, got ${result.status}`);
      if (result.data.success !== false) throw new Error('Success should be false');
    }
  );
  
  // Test 11: Invalid Float ID
  await runTest(
    'Invalid Float ID',
    `${API_BASE}/argo/profile/99999999`,
    (result) => {
      if (result.status !== 200) throw new Error(`Expected 200, got ${result.status}`);
      if (result.data.success !== false) throw new Error('Success should be false for non-existent float');
    }
  );
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total:  ${passCount + failCount}`);
  console.log('='.repeat(60));
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Module 3 is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  console.error('\nMake sure the backend is running on http://localhost:5000');
  process.exit(1);
});
