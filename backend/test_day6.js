import assert from 'assert';

const API_BASE = 'http://localhost:5000/api/v1';
let adminToken = '';
let employeeToken = '';
let candidateId = null;
let offerId = null;
let interviewId = null;

async function runTests() {
  console.log('--- STARTING MODULE 4-8 BUSINESS RULES INTEGRATION TESTS ---');

  try {
    // 1. Setup Admin & Employee accounts
    const adminEmail = `admin_m4_${Date.now()}@wfm.com`;
    const employeeEmail = `emp_m4_${Date.now()}@wfm.com`;

    console.log('1. Registering and authenticating Test Admin...');
    const regAdminRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recruitment Officer',
        email: adminEmail,
        password: 'Password123!',
        role: 'Admin',
        organization: 'MC',
        accessCode: 'ADMIN2026'
      })
    });
    assert.strictEqual(regAdminRes.status, 201, 'Admin registration should succeed');

    const loginAdminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'Password123!' })
    });
    const loginAdminData = await loginAdminRes.json();
    adminToken = loginAdminData.token;

    // 2. Candidates Kanban & Unique Emails (Module 4.1)
    console.log('2. Testing candidate registration constraints...');
    const candEmail = `candidate_${Date.now()}@gmail.com`;
    const candRes = await fetch(`${API_BASE}/recruitment/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Alice Developer',
        email: candEmail,
        phone: '+15559876',
        resumeUrl: 'http://cloudinary.com/resumes/alice.pdf',
        skills: ['JavaScript', 'React', 'Node.js'],
        experienceYears: 5,
        appliedForDesignationId: 1,
        source: 'referral'
      })
    });
    const candData = await candRes.json();
    assert.strictEqual(candRes.status, 201);
    candidateId = candData.candidateId;

    // Duplicate candidate email check
    const dupRes = await fetch(`${API_BASE}/recruitment/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Alice Second',
        email: candEmail,
        skills: [],
        experienceYears: 1
      })
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate candidate email should be blocked');

    // 3. AI Resume Analyzer & Caching (Module 4.2)
    console.log('3. Testing AI resume scoring scorecard...');
    const analyzeRes = await fetch(`${API_BASE}/recruitment/candidates/${candidateId}/analyze`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const analyzeData = await analyzeRes.json();
    assert.strictEqual(analyzeRes.status, 200);
    assert.ok(analyzeData.analysis.score >= 0 && analyzeData.analysis.score <= 100);

    // Verify cache hits
    const cacheRes = await fetch(`${API_BASE}/recruitment/candidates/${candidateId}/analyze`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const cacheData = await cacheRes.json();
    assert.strictEqual(cacheData.message, 'Analysis fetched from cache.');

    // 4. Interview Scheduling (Module 4.3)
    console.log('4. Testing interview constraints...');
    // Rule: can't schedule interview while in Applied (needs Screening complete)
    const badIntRes = await fetch(`${API_BASE}/recruitment/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        candidateId,
        interviewerId: 1,
        type: 'Technical',
        scheduledAt: '2026-08-01 14:00:00'
      })
    });
    assert.strictEqual(badIntRes.status, 400, 'Scheduling without screening complete should be blocked');

    // Transition candidate to Screening
    await fetch(`${API_BASE}/recruitment/candidates/${candidateId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Screening' })
    });

    // Schedule interview again
    const okIntRes = await fetch(`${API_BASE}/recruitment/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        candidateId,
        interviewerId: 1,
        type: 'Technical',
        scheduledAt: '2026-08-01 14:00:00'
      })
    });
    assert.strictEqual(okIntRes.status, 201, 'Should schedule successfully after screening complete');

    // 5. Offer Letter Generation & Approvals (Module 4.4)
    console.log('5. Testing contract offers & HR approval check...');
    const offerRes = await fetch(`${API_BASE}/recruitment/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        candidateId,
        proposedSalary: 95000,
        proposedJoiningDate: '2026-09-01'
      })
    });
    const offerData = await offerRes.json();
    assert.strictEqual(offerRes.status, 201);
    offerId = offerData.offerId;

    // Rule: cannot accept offer without HR approvals
    const badAcceptRes = await fetch(`${API_BASE}/recruitment/offers/${offerId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Accepted' })
    });
    assert.strictEqual(badAcceptRes.status, 400, 'Accepting unapproved offer should be blocked');

    // Approve offer
    const approveRes = await fetch(`${API_BASE}/recruitment/offers/${offerId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(approveRes.status, 200);

    // Accept offer now
    const acceptRes = await fetch(`${API_BASE}/recruitment/offers/${offerId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Accepted' })
    });
    assert.strictEqual(acceptRes.status, 200, 'Should accept after approval');

    // 6. Attendance Clocking & Geolocation Radius Check (Module 5)
    console.log('6. Testing daily attendance logs...');
    // Create designations, locations, shifts, holidays to avoid constraint failures
    await fetch(`${API_BASE}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Engineering Dept', code: 'ENG', parentId: null, managerId: null })
    });
    await fetch(`${API_BASE}/designations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Software Architect', departmentId: 1, level: 'senior' })
    });
    await fetch(`${API_BASE}/office-locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'San Francisco HQ', address: '123 Market St', latitude: 37.7749, longitude: -122.4194, radiusMeters: 50 })
    });
    await fetch(`${API_BASE}/work-shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Standard Morning', startTime: '09:00', endTime: '17:00', gracePeriodMinutes: 15, organizationId: 1 })
    });
    await fetch(`${API_BASE}/holidays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ date: '2026-11-25', name: 'Thanksgiving', type: 'national', organizationId: 1 })
    });

    // Register test employee
    console.log('Registering test employee for attendance tests...');
    const onboardEmpRes = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Developer Bob',
        email: employeeEmail,
        mobile: '+15552345',
        address: '789 Pine Rd, SF',
        gender: 'Male',
        bloodGroup: 'A+',
        dob: '1995-04-20',
        departmentId: 1,
        designationId: 1,
        joiningDate: '2026-02-01',
        reportingManagerId: null,
        employmentType: 'Full-time',
        salaryGrade: 'G3',
        salary: '120000',
        officeLocationId: 1,
        workShiftId: 1
      })
    });
    const onboardData = await onboardEmpRes.json();
    assert.strictEqual(onboardEmpRes.status, 201);

    // Reset employee password to set a known password for login
    console.log('Resetting employee password for login verification...');
    const resetPassRes = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: employeeEmail, newPassword: 'Password123!' })
    });
    assert.strictEqual(resetPassRes.status, 200, 'Password reset should succeed');

    // Login as employee
    const loginEmpRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: employeeEmail, password: 'Password123!' })
    });
    const loginEmpData = await loginEmpRes.json();
    employeeToken = loginEmpData.token;

    // Clock In remote (outside 50m radius HQ)
    console.log('Clocking in outside radius HQ...');
    const clockInRes = await fetch(`${API_BASE}/attendance/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${employeeToken}` },
      body: JSON.stringify({
        latitude: 34.0522, // LA coordinates (miles away from SF HQ)
        longitude: -118.2437,
        method: 'web'
      })
    });
    const clockInData = await clockInRes.json();
    if (clockInRes.status !== 200) {
      console.error('Clock In Failed! Status:', clockInRes.status, 'Response:', clockInData);
    }
    assert.strictEqual(clockInRes.status, 200);
    assert.strictEqual(clockInData.status, 'Remote', 'Should flag WFH/Remote when outside geo radius');

    // Clock Out
    const clockOutRes = await fetch(`${API_BASE}/attendance/clock-out`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    assert.strictEqual(clockOutRes.status, 200);

    // 7. Leave Management & Auto Balances Deduction (Module 6)
    console.log('7. Testing leave request balance deduction...');
    // Apply leave for next week
    const leaveRes = await fetch(`${API_BASE}/leave/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${employeeToken}` },
      body: JSON.stringify({
        leaveType: 'Casual',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        reason: 'Family event'
      })
    });
    const leaveData = await leaveRes.json();
    assert.strictEqual(leaveRes.status, 201);
    assert.strictEqual(leaveData.durationDays, 3);

    // Approve leave request (Admin)
    const approveLeaveRes = await fetch(`${API_BASE}/leave/requests/${leaveData.requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'approve' })
    });
    assert.strictEqual(approveLeaveRes.status, 200);

    // Verify balance decreased
    const balRes = await fetch(`${API_BASE}/leave/balances`, {
      headers: { 'Authorization': `Bearer ${employeeToken}` }
    });
    const balData = await balRes.json();
    const casualBal = balData.balances.find(b => b.leave_type === 'Casual');
    assert.strictEqual(casualBal.used_days, 3, 'Casual leaves used should be deducted');

    // 8. Payroll Calculations (Module 7)
    console.log('8. Testing payroll run calculations...');
    const payRes = await fetch(`${API_BASE}/payroll/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ month: 8, year: 2026 })
    });
    assert.strictEqual(payRes.status, 201);

    // 9. Performance Management Goals (Module 8)
    console.log('9. Testing performance reviews...');
    const goalRes = await fetch(`${API_BASE}/performance/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        employeeId: 1, // bob's employee row index is 1
        quarter: 'Q3',
        year: 2026,
        goal: 'Deploy recruitment pipeline',
        kpiTarget: 'Zero bugs'
      })
    });
    assert.strictEqual(goalRes.status, 201);

    console.log('--- ALL MODULE 4-8 INTEGRATION TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  }
}

runTests();
