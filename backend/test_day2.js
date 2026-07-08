import path from 'path';

process.env.PORT = 5003;
process.env.JWT_SECRET = 'TEST_JWT_SECRET_DAY2';

console.log('--- STARTING DAY-2 CUSTOM ROLES INTEGRATION TESTS ---');

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
      console.error(`[FAIL] ${message}${actual !== null ? ` (Actual: ${JSON.stringify(actual)})` : ''}`);
    }
  }

  try {
    const baseUrl = 'http://localhost:5003/api/v1';
    const timestamp = Date.now();
    const customRoleName = `Lead Dev ${timestamp}`;
    const customOrgName = `Dynamic R&D Dept ${timestamp}`;

    // 1. Sign up Super Admin
    const superEmail = `super-${timestamp}@test.com`;
    const signupRes = await makeRequest(`${baseUrl}/auth/register`, 'POST', {
      name: 'Super Creator',
      email: superEmail,
      password: 'SuperPassword123',
      role: 'Super Admin',
      organization: 'Main Corp',
      accessCode: 'SUPER2026'
    });
    assert(signupRes.status === 201, 'Super Admin registered successfully');

    // 2. Login Super Admin
    const loginRes = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: superEmail,
      password: 'SuperPassword123'
    });
    assert(loginRes.status === 200 && loginRes.data.token !== undefined, 'Super Admin logged in');
    const superToken = loginRes.data.token;

    // 3. Fetch default roles list
    const rolesListRes = await makeRequest(`${baseUrl}/roles`, 'GET', null, superToken);
    assert(
      rolesListRes.status === 200 && 
      rolesListRes.data.roles.some(r => r.name === 'Super Admin' && r.level === 100) &&
      rolesListRes.data.roles.some(r => r.name === 'Admin' && r.level === 50) &&
      rolesListRes.data.roles.some(r => r.name === 'Employee' && r.level === 10),
      'Roles list contains all system defaults with levels'
    );

    // 4. Create custom role
    const leadDevRoleRes = await makeRequest(`${baseUrl}/roles`, 'POST', {
      name: customRoleName,
      level: 90,
      permissions: ['org:read', 'org:write', 'invite:generate']
    }, superToken);
    assert(
      leadDevRoleRes.status === 201 && leadDevRoleRes.data.role.name === customRoleName,
      `Created custom role "${customRoleName}" with level 90 and permissions`
    );

    // 5. Attempt privilege escalation (create level 100 role)
    const escalRes = await makeRequest(`${baseUrl}/roles`, 'POST', {
      name: `Fake Super Admin ${timestamp}`,
      level: 100,
      permissions: ['role:manage']
    }, superToken);
    assert(
      escalRes.status === 400 || escalRes.status === 403,
      'Hierarchy escalation blocked: cannot create role level >= user level',
      escalRes.status
    );

    // 6. Generate invite code for custom role
    const inviteRes = await makeRequest(`${baseUrl}/invites`, 'POST', {
      role: customRoleName,
      organization: 'Engineering'
    }, superToken);
    assert(
      inviteRes.status === 201 && inviteRes.data.invite.role === customRoleName,
      'Generated invitation code for custom role'
    );
    const inviteCode = inviteRes.data.invite.code;

    // 7. Register new employee using this custom role invite code
    const devEmail = `leaddev-${timestamp}@test.com`;
    const regDevRes = await makeRequest(`${baseUrl}/auth/register`, 'POST', {
      name: 'Senior Developer',
      email: devEmail,
      password: 'DevPassword123',
      inviteCode: inviteCode
    });
    assert(
      regDevRes.status === 201 && regDevRes.data.user.role === customRoleName,
      `Registered user with custom role "${customRoleName}" via invite token`
    );

    // 8. Log in as Lead Developer User
    const devLoginRes = await makeRequest(`${baseUrl}/auth/login`, 'POST', {
      email: devEmail,
      password: 'DevPassword123'
    });
    assert(devLoginRes.status === 200 && devLoginRes.data.token !== undefined, 'Lead Developer logged in');
    const devToken = devLoginRes.data.token;

    // 9. Assert Lead Developer permissions
    // a. Create child department (requires org:write -> allowed)
    const createOrgRes = await makeRequest(`${baseUrl}/organizations`, 'POST', {
      name: customOrgName,
      parentId: 1
    }, devToken);
    assert(
      createOrgRes.status === 201,
      'Lead Dev user allowed to perform "org:write" action based on role permissions',
      createOrgRes.status
    );

    // b. Create a custom role (requires role:manage -> denied)
    const createRoleRes = await makeRequest(`${baseUrl}/roles`, 'POST', {
      name: `Junior Intern ${timestamp}`,
      level: 5,
      permissions: ['org:read']
    }, devToken);
    assert(
      createRoleRes.status === 403 && createRoleRes.data.error.includes('role:manage'),
      'Lead Dev user blocked from role management due to missing "role:manage" permission',
      createRoleRes.data
    );

    // Summary
    console.log(`\nVerification Summary: ${passedTests}/${totalTests} tests passed.`);
    if (passedTests === totalTests) {
      console.log('DAY-2 ROLES AND HIERARCHIES VERIFICATION COMPLETED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('DAY-2 ROLES AND HIERARCHIES VERIFICATION FAILED!');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}, 1000);
