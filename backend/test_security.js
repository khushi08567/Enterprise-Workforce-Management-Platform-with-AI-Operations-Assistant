import path from 'path';

process.env.PORT = 5002;
process.env.JWT_SECRET = 'TEST_JWT_SECRET_SECURITY';

console.log('--- STARTING SECURITY CONTROLS INTEGRATION TESTS ---');

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
    const baseUrl = 'http://localhost:5002/api/v1';

    // 1. Register a Super Admin (to act as the unblocker)
    const superEmail = `super-admin-${Date.now()}@test.com`;
    const superReg = await makeRequest(`${baseUrl}/auth/register`, 'POST', {
      name: 'Super Admin Recovery',
      email: superEmail,
      password: 'CorrectPassword123',
      role: 'Super Admin',
      organization: 'Main Corp',
      accessCode: 'SUPER2026'
    });
    assert(superReg.status === 201, 'Super Admin registered successfully');

    const superLogin = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: superEmail,
      password: 'CorrectPassword123'
    });
    assert(superLogin.status === 200 && superLogin.data.token !== undefined, 'Super Admin logged in');
    const superToken = superLogin.data.token;

    // 2. Register a standard Admin (the subject to be blocked)
    const adminEmail = `admin-subject-${Date.now()}@test.com`;
    const adminReg = await makeRequest(`${baseUrl}/auth/register`, 'POST', {
      name: 'Target Admin',
      email: adminEmail,
      password: 'CorrectPassword123',
      role: 'Admin',
      organization: 'Main Corp',
      accessCode: 'ADMIN2026'
    });
    assert(adminReg.status === 201, 'Target Admin registered successfully');

    // 3. Perform 1st failed login attempt on Target Admin
    const fail1 = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'WrongPassword'
    });
    assert(
      fail1.status === 401 && fail1.data.error.includes('Failed attempt 1 of 3'), 
      '1st failed attempt logged',
      fail1.data.error
    );

    // 4. Perform 2nd failed login attempt
    const fail2 = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'WrongPassword'
    });
    assert(
      fail2.status === 401 && fail2.data.error.includes('Failed attempt 2 of 3'), 
      '2nd failed attempt logged',
      fail2.data.error
    );

    // 5. Perform 3rd failed login attempt (Should block account)
    const fail3 = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'WrongPassword'
    });
    assert(
      fail3.status === 403 && fail3.data.error.includes('blocked due to 3 failed login attempts'), 
      '3rd failed attempt blocks the account',
      fail3.data.error
    );

    // 6. Subsequent attempts (even with correct password) should fail
    const subsequent = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'CorrectPassword123'
    });
    assert(
      subsequent.status === 403 && subsequent.data.error.includes('blocked due to multiple failed login attempts'), 
      'Subsequent login attempts rejected for blocked account',
      subsequent.data.error
    );

    // 7. Reset password (should clear attempts and unblock account)
    const resetRes = await makeRequest(`${baseUrl}/auth/reset-password`, 'POST', {
      email: adminEmail,
      newPassword: 'BrandNewPassword123'
    });
    assert(
      resetRes.status === 200 && resetRes.data.message.includes('reset successfully'),
      'Password reset successful'
    );

    // 8. Login with new password (should succeed)
    const loginNewRes = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'BrandNewPassword123'
    });
    assert(
      loginNewRes.status === 200 && loginNewRes.data.token !== undefined,
      'Login successful after password reset'
    );

    // 9. Re-block Target Admin for unblock verification
    await makeRequest(`${baseUrl}/auth/login`, 'POST', { email: adminEmail, password: 'WrongPassword' });
    await makeRequest(`${baseUrl}/auth/login`, 'POST', { email: adminEmail, password: 'WrongPassword' });
    await makeRequest(`${baseUrl}/auth/login`, 'POST', { email: adminEmail, password: 'WrongPassword' });

    // 10. Super Admin retrieves blocked list and unblocks target
    const blockedList = await makeRequest(`${baseUrl}/auth/blocked`, 'GET', null, superToken);
    assert(
      blockedList.status === 200 && blockedList.data.blockedUsers.some(u => u.email === adminEmail),
      'Blocked admin listed in Super Admin retrieval endpoint'
    );

    const targetUserId = blockedList.data.blockedUsers.find(u => u.email === adminEmail).id;
    const unblockRes = await makeRequest(`${baseUrl}/auth/unblock`, 'POST', {
      userId: targetUserId
    }, superToken);
    assert(
      unblockRes.status === 200 && unblockRes.data.message.includes('unblocked successfully'),
      'Super Admin unblock request approved and completed'
    );

    // 11. Verify Target Admin can log in again after unblock
    const finalLogin = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: adminEmail,
      password: 'BrandNewPassword123'
    });
    assert(
      finalLogin.status === 200,
      'User successfully authenticates after Admin unblock restoration'
    );

    // Summary
    console.log(`\nVerification Summary: ${passedTests}/${totalTests} tests passed.`);
    if (passedTests === totalTests) {
      console.log('SECURITY AND LOCKOUT CONTROLS VERIFIED COMPLETED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('SECURITY CONTROLS VERIFICATION FAILED!');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}, 1000);
