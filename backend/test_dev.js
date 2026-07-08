import path from 'path';

// Set test port and environment
process.env.PORT = 5001;
process.env.JWT_SECRET = 'TEST_JWT_SECRET_KEY';

console.log('--- STARTING DEV WORKSPACE ENDPOINTS TESTS ---');

// Import server
await import('./src/server.js');

async function makeRequest(url) {
  const response = await fetch(url);
  const data = await response.json();
  return { status: response.status, data };
}

setTimeout(async () => {
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message, actual = null) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}${actual !== null ? ` (Actual: ${actual})` : ''}`);
    }
  }

  try {
    const baseUrl = 'http://localhost:5001/api/v1/dev';

    // Test 1: Health check remains intact
    const healthRes = await makeRequest('http://localhost:5001/api/v1/health');
    assert(healthRes.status === 200, 'Health endpoint is reachable');

    // Test 2: Dev metrics response
    const metricsRes = await makeRequest(`${baseUrl}/metrics`);
    assert(
      metricsRes.status === 200 && 
      metricsRes.data.metrics.commitsCount === 284 && 
      metricsRes.data.metrics.activeBranches === 4, 
      'Dev metrics endpoint returns correct mock statistics'
    );

    // Test 3: Dev logs response
    const logsRes = await makeRequest(`${baseUrl}/logs`);
    assert(
      logsRes.status === 200 && 
      logsRes.data.logs.length > 0 &&
      logsRes.data.logs[0].type !== undefined,
      'Dev logs endpoint returns diagnostic reports array'
    );

    // Summary
    console.log(`\nVerification Summary: ${passedTests}/${totalTests} tests passed.`);
    if (passedTests === totalTests) {
      console.log('DEV ENDPOINTS VERIFICATION COMPLETED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('DEV ENDPOINTS VERIFICATION FAILED!');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}, 1000);
