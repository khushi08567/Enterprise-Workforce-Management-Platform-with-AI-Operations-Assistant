import path from 'path';

process.env.PORT = 5001;
process.env.JWT_SECRET = 'TEST_JWT_SECRET_DAY1';

console.log('--- STARTING DAY-1 INTEGRATION TESTS ---');

// Import server
await import('./src/server.js');

async function makeRequest(url, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(url, options);
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
    const baseUrl = 'http://localhost:5001/api/v1';

    // 1. Sign up Super Admin
    const adminEmail = `admin-${Date.now()}@test.com`;
    const signupRes = await makeRequest(`${baseUrl}/auth/register`, 'POST', {
      name: 'Test Super Admin',
      email: adminEmail,
      password: 'Password123',
      role: 'Super Admin',
      organization: 'Main Corp',
      accessCode: 'SUPER2026'
    });
    assert(signupRes.status === 201, 'Super Admin registered successfully');

    // 2. Login Super Admin
    const loginRes = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'Password123'
    });
    assert(loginRes.status === 200 && loginRes.data.token !== undefined, 'Super Admin logged in and received token');
    const token = loginRes.data.token;

    const orgName = 'Day-1 Tech Devs ' + Date.now();

    // 3. Create a child department
    const createOrgRes = await makeRequest(`${baseUrl}/organizations`, 'POST', {
      name: orgName,
      parentId: 1
    }, token);
    assert(
      createOrgRes.status === 201 && createOrgRes.data.organization.name === orgName,
      `Created child department node "${orgName}"`
    );

    // 4. Generate an invite token
    const createInviteRes = await makeRequest(`${baseUrl}/invites`, 'POST', {
      role: 'Employee',
      organization: orgName
    }, token);
    assert(
      createInviteRes.status === 201 && createInviteRes.data.invite.code !== undefined,
      'Generated secure invite code for Employee role'
    );
    const inviteCode = createInviteRes.data.invite.code;

    // 5. Validate invite token publicly
    const validateRes = await makeRequest(`${baseUrl}/invites/validate`, 'POST', {
      code: inviteCode
    });
    assert(
      validateRes.status === 200 && validateRes.data.role === 'Employee' && validateRes.data.organization === orgName,
      'Public validate endpoint verified invite token contents'
    );

    // 6. Sign up new employee using inviteCode
    const empEmail = `employee-${Date.now()}@test.com`;
    const empSignupRes = await makeRequest(`${baseUrl}/auth/register`, 'POST', {
      name: 'New Recruit',
      email: empEmail,
      password: 'SecurePassword123',
      inviteCode: inviteCode
    });
    assert(
      empSignupRes.status === 201 && empSignupRes.data.user.role === 'Employee' && empSignupRes.data.user.organization === orgName,
      `Registered new Employee to "${orgName}" using inviteCode without accessCodes`
    );

    // 7. Try validating the inviteCode again (should be redeemed and fail)
    const validateAgainRes = await makeRequest(`${baseUrl}/invites/validate`, 'POST', {
      code: inviteCode
    });
    assert(
      validateAgainRes.status === 400,
      'Already redeemed invite code rejected for subsequent signups'
    );

    // Summary
    console.log(`\nVerification Summary: ${passedTests}/${totalTests} tests passed.`);
    if (passedTests === totalTests) {
      console.log('DAY-1 ENDPOINTS VERIFICATION COMPLETED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('DAY-1 ENDPOINTS VERIFICATION FAILED!');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}, 1000);
