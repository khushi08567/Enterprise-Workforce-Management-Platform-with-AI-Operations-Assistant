import assert from 'assert';
import http from 'http';
import sqlite3 from 'sqlite3';

const DB_PATH = './database.sqlite';
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

const db = new sqlite3.Database(DB_PATH);

// Helper to query the DB directly in tests
function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper to make HTTP requests
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : {}
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            body: { text: data }
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING DAY 3 & DAY 4 INTEGRATION TESTS ---');

  try {
    // 1. Setup/Login details
    // We will register a Super Admin and an Employee to test delegations
    const suffix = Date.now();
    const adminEmail = `admin_${suffix}@wfm.com`;
    const employeeEmail = `employee_${suffix}@wfm.com`;

    console.log('1. Registering test users...');
    
    // Register Super Admin
    const adminReg = await makeRequest('POST', '/auth/register', {}, {
      name: 'Test Admin',
      email: adminEmail,
      password: 'password123',
      role: 'Super Admin',
      organization: 'Engineering',
      accessCode: 'SUPER2026'
    });
    assert.strictEqual(adminReg.statusCode, 201);
    const adminId = adminReg.body.user.id;

    // Register Employee
    const empReg = await makeRequest('POST', '/auth/register', {}, {
      name: 'Test Employee',
      email: employeeEmail,
      password: 'password123',
      role: 'Employee',
      organization: 'Engineering'
    });
    assert.strictEqual(empReg.statusCode, 201);
    const employeeId = empReg.body.user.id;

    // Log in both users to obtain JWTs
    console.log('2. Logging in test users...');
    const adminLogin = await makeRequest('POST', '/auth/login', {}, { email: adminEmail, password: 'password123' });
    assert.strictEqual(adminLogin.statusCode, 200);
    const adminToken = adminLogin.body.token;

    const empLogin = await makeRequest('POST', '/auth/login', {}, { email: employeeEmail, password: 'password123' });
    assert.strictEqual(empLogin.statusCode, 200);
    const empToken = empLogin.body.token;

    // Create a Custom Role (level 30) for testing delegation
    console.log('3. Registering a custom role (level 30)...');
    const roleReg = await makeRequest('POST', '/roles', { 'Authorization': `Bearer ${adminToken}` }, {
      name: `CustomRole_${suffix}`,
      level: 30,
      permissions: ['org:read', 'invite:generate']
    });
    assert.strictEqual(roleReg.statusCode, 201);
    const customRoleName = `CustomRole_${suffix}`;

    // 4. Test Role Delegation creation and validation rules
    console.log('4. Testing role delegation validations...');
    
    // Attempting to delegate Super Admin role (level 100) as Employee (level 10) -> should fail (403)
    const failDelegation = await makeRequest('POST', '/role-delegation-policies', { 'Authorization': `Bearer ${empToken}` }, {
      delegateToId: adminId,
      roleName: 'Super Admin',
      startDate: new Date(Date.now() - 100000).toISOString(),
      endDate: new Date(Date.now() + 100000).toISOString()
    });
    assert.strictEqual(failDelegation.statusCode, 403, 'Should block delegating higher roles than self');

    // Delegate CustomRole (level 30) to Employee -> should succeed
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const validDelegation = await makeRequest('POST', '/role-delegation-policies', { 'Authorization': `Bearer ${adminToken}` }, {
      delegateToId: employeeId,
      roleName: customRoleName,
      startDate: new Date(Date.now() - 10000).toISOString(), // active now
      endDate: tomorrow.toISOString()
    });
    assert.strictEqual(validDelegation.statusCode, 201);
    const delegationId = validDelegation.body.delegation.id;

    // 5. Verify dynamic auth permissions escalation
    console.log('5. Testing auth permissions escalation during active delegation...');
    
    // The Employee normally has level 10 and 'org:read' only.
    // Because of the active delegation, they should now temporarily inherit CustomRole (level 30) permissions ('org:read', 'invite:generate').
    // Let's test that Employee can now call invite generation (normally requires invite:generate)
    const generateInvite = await makeRequest('POST', '/invites', { 'Authorization': `Bearer ${empToken}` }, {
      role: 'Employee',
      organization: 'Engineering'
    });
    assert.strictEqual(generateInvite.statusCode, 201, 'Employee should successfully create an invite while acting under delegated role');

    // Let's cancel the delegation
    console.log('6. Revoking delegation policy...');
    const cancelRes = await makeRequest('DELETE', `/role-delegation-policies/${delegationId}`, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(cancelRes.statusCode, 200);

    // Verify escalation is removed
    const generateInviteBlocked = await makeRequest('POST', '/invites', { 'Authorization': `Bearer ${empToken}` }, {
      role: 'Employee',
      organization: 'Engineering'
    });
    assert.strictEqual(generateInviteBlocked.statusCode, 403, 'Employee should be blocked again after delegation is cancelled');

    // 7. AI Assistant Chatbot Query Verification
    console.log('7. Testing AI Assistant chatbot...');
    const aiQuery1 = await makeRequest('POST', '/ai/query', { 'Authorization': `Bearer ${empToken}` }, {
      query: 'Who is registered in the staff list?'
    });
    assert.strictEqual(aiQuery1.statusCode, 200);
    assert.ok(aiQuery1.body.response.includes('Active database records'), 'Should return database staff context');

    const aiQuery2 = await makeRequest('POST', '/ai/query', { 'Authorization': `Bearer ${empToken}` }, {
      query: 'Hello AI assistant'
    });
    assert.strictEqual(aiQuery2.statusCode, 200);
    assert.ok(aiQuery2.body.response.includes('I can query active workspace parameters'), 'Should return generic guide response');

    // 8. Email Logs Simulator Verification
    console.log('8. Testing Email Logs Simulator...');
    const emailLogs = await makeRequest('GET', '/email/logs', { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(emailLogs.statusCode, 200);
    assert.ok(emailLogs.body.logs.length > 0, 'Should return logged emails (e.g. WelcomeEmployee)');

    console.log('--- ALL DAY 3 & DAY 4 INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Test run failed with error:', error);
    db.close();
    process.exit(1);
  }
}

runTests();
