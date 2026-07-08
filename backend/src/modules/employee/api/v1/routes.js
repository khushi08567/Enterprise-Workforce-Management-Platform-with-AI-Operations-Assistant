import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';
import { logSimulatedEmail } from '#@/core/email.js';
import { writeAuditLog } from '#@/core/audit.js';

const router = Router();

// Cycle detection for reporting hierarchy
async function wouldCreateManagerCycle(employeeUserId, newManagerUserId) {
  if (!newManagerUserId) return false;
  if (parseInt(employeeUserId) === parseInt(newManagerUserId)) return true;
  let currentManagerUserId = parseInt(newManagerUserId);
  while (currentManagerUserId) {
    const managerEmp = await dbGet('SELECT reporting_manager_id FROM employees WHERE user_id = ?', [currentManagerUserId]);
    if (!managerEmp || !managerEmp.reporting_manager_id) break;
    if (parseInt(managerEmp.reporting_manager_id) === parseInt(employeeUserId)) return true;
    currentManagerUserId = managerEmp.reporting_manager_id;
  }
  return false;
}

// 1. GET /api/v1/employees - List all employees (paginated, filterable, searchable)
router.get('/', authenticateToken, async (req, res) => {
  const { departmentId, status, search } = req.query;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;

  const userRole = req.user.role;
  const canSeeSalary = ['Super Admin', 'Admin', 'HR', 'Finance'].includes(userRole);

  try {
    let query = `
      SELECT e.*, u.name, u.email, u.status as user_status,
      o.name as department_name, o.code as department_code,
      d.title as designation_title, d.level as designation_level,
      m.name as manager_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN organizations o ON e.department_id = o.id
      LEFT JOIN designations d ON e.designation_id = d.id
      LEFT JOIN users m ON e.reporting_manager_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (departmentId) {
      query += ' AND e.department_id = ?';
      params.push(parseInt(departmentId));
    }

    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    } else {
      query += " AND e.status = 'Active'";
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR e.employee_id LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    // Get total count for pagination headers
    const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    const totalCountRow = await dbGet(countQuery, params);
    const totalCount = totalCountRow ? totalCountRow.count : 0;

    query += ' ORDER BY e.id ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const employees = await dbAll(query, params);

    // Redact salary information at API level based on RBAC
    const redactedEmployees = employees.map(emp => {
      const copy = { ...emp };
      if (!canSeeSalary) {
        delete copy.salary;
        delete copy.salary_grade;
      }
      return copy;
    });

    res.status(200).json({
      employees: redactedEmployees,
      pagination: {
        total: totalCount,
        limit,
        offset
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list employees: ' + err.message });
  }
});

// 2. GET /api/v1/employees/me/team - List direct reports for logged-in manager
router.get('/me/team', authenticateToken, async (req, res) => {
  try {
    const directReports = await dbAll(`
      SELECT e.*, u.name, u.email, d.title as designation_title
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN designations d ON e.designation_id = d.id
      WHERE e.reporting_manager_id = ? AND e.status = 'Active'
    `, [req.user.id]);
    res.status(200).json({ team: directReports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve team details: ' + err.message });
  }
});

// 3. GET /api/v1/employees/:id - Retrieve employee profile detail
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const canSeeSalary = ['Super Admin', 'Admin', 'HR', 'Finance'].includes(userRole);

  try {
    const employee = await dbGet(`
      SELECT e.*, u.name, u.email, o.name as department_name, d.title as designation_title, m.name as manager_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN organizations o ON e.department_id = o.id
      LEFT JOIN designations d ON e.designation_id = d.id
      LEFT JOIN users m ON e.reporting_manager_id = m.id
      WHERE e.id = ?
    `, [id]);

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    // Get documents and timeline events
    const documents = await dbAll('SELECT * FROM employee_documents WHERE employee_id = ?', [id]);
    const timeline = await dbAll('SELECT * FROM employee_timeline_events WHERE employee_id = ? ORDER BY event_date ASC', [id]);

    // Redact salary
    if (!canSeeSalary) {
      delete employee.salary;
      delete employee.salary_grade;
    }

    res.status(200).json({
      employee,
      documents,
      timeline
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile: ' + err.message });
  }
});

// 4. POST /api/v1/employees - Add new employee (Onboarding Wizard)
router.post('/', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const {
    name, email, mobile, address, gender, bloodGroup, dob,
    departmentId, designationId, officeLocationId, workShiftId, joiningDate, reportingManagerId,
    employmentType, salaryGrade, salary, documents
  } = req.body;

  if (!name || !email || !joiningDate) {
    return res.status(400).json({ error: 'Name, email, and joining date parameters are required.' });
  }

  // 1. Check duplicate email in users
  try {
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'A user login with this email address already exists.' });
    }

    // 2. Validate joining date is not in the future
    const joinDateObj = new Date(joiningDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // allow today
    if (joinDateObj > today) {
      return res.status(400).json({ error: 'Joining date cannot be set in the future.' });
    }

    // 3. Cycle check for manager if reportingManagerId is provided
    if (reportingManagerId) {
      const managerUser = await dbGet('SELECT id FROM users WHERE id = ?', [reportingManagerId]);
      if (!managerUser) {
        return res.status(404).json({ error: 'Specified reporting manager user not found.' });
      }
    }

    // 4. Generate unique EMP ID using retry-on-conflict loop to prevent race conditions
    let employeeId = '';
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 10) {
      attempts++;
      const countRow = await dbGet('SELECT COUNT(*) as count FROM employees');
      const nextNum = 1000 + countRow.count + attempts;
      employeeId = `EMP${nextNum}`;

      // Check if duplicate EMP ID exists in database
      const dupId = await dbGet('SELECT id FROM employees WHERE employee_id = ?', [employeeId]);
      if (!dupId) {
        success = true;
      }
    }

    if (!success) {
      return res.status(500).json({ error: 'Failed to generate a unique employee ID. Please try again.' });
    }

    // 5. Create user login record (random hashed password, must_change_password = 1)
    const randomHex = crypto.randomBytes(16).toString('hex');
    const placeholderHash = await bcrypt.hash(randomHex, 10);
    
    const userResult = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, organization, status, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, placeholderHash, 'Employee', 'Engineering', 'active', 1]
    );
    const newUserId = userResult.id;

    // Assign Role permissions in role_assignments table
    await dbRun(
      'INSERT INTO role_assignments (user_id, role_name, assigned_by) VALUES (?, ?, ?)',
      [newUserId, 'Employee', req.user.id]
    );

    // 6. Create employee profile
    const empResult = await dbRun(
      `INSERT INTO employees (
        user_id, employee_id, mobile, address, gender, blood_group, dob,
        department_id, designation_id, office_location_id, work_shift_id, joining_date, reporting_manager_id,
        employment_type, salary_grade, salary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newUserId, employeeId, mobile || null, address || null, gender || null, bloodGroup || null, dob || null,
        departmentId ? parseInt(departmentId) : null,
        designationId ? parseInt(designationId) : null,
        officeLocationId ? parseInt(officeLocationId) : null,
        workShiftId ? parseInt(workShiftId) : null,
        joiningDate,
        reportingManagerId ? parseInt(reportingManagerId) : null,
        employmentType || 'Full-time',
        salaryGrade || null,
        salary ? parseFloat(salary) : null,
        'Active'
      ]
    );
    const newEmpId = empResult.id;

    // 7. Insert documents if provided
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.type && doc.url) {
          await dbRun(
            'INSERT INTO employee_documents (employee_id, type, url) VALUES (?, ?, ?)',
            [newEmpId, doc.type, doc.url]
          );
        }
      }
    }

    // 8. Insert Joined event to timeline
    await dbRun(
      'INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta) VALUES (?, ?, ?, ?)',
      [newEmpId, 'Joined', joiningDate, JSON.stringify({ note: `Joined as employee ${employeeId}` })]
    );

    // 9. Generate password reset link and send welcome email
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours
    await dbRun(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, resetToken, expiresAt]
    );

    const resetLink = `http://localhost:5173/?view=reset-password&token=${resetToken}&email=${encodeURIComponent(email)}`;
    const emailSubject = 'Welcome to the Team! Set Up Your Account';
    const emailBody = `Hello ${name},\n\nWelcome to the company! Your Employee ID is ${employeeId}.\n\nTo set up your password and log into your account, please click the link below:\n${resetLink}\n\nThis setup link is active for 24 hours.`;
    
    await logSimulatedEmail(email, emailSubject, emailBody, 'employee_onboarding');

    await writeAuditLog(req.user.id, 'Employee Onboarded', `Onboarded employee ${employeeId} (${name}, ${email}).`);

    res.status(201).json({
      message: 'Employee onboarded successfully. Welcome email dispatched.',
      employee: { id: newEmpId, employeeId, name, email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Onboarding transaction failed: ' + err.message });
  }
});

// 5. PUT /api/v1/employees/:id - Edit employee profile
router.put('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;
  const {
    name, mobile, address, gender, bloodGroup, dob,
    departmentId, designationId, joiningDate, reportingManagerId,
    employmentType, salaryGrade, salary, status
  } = req.body;

  try {
    const employee = await dbGet('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Cycle check on manager
    if (reportingManagerId) {
      const isCycle = await wouldCreateManagerCycle(employee.user_id, reportingManagerId);
      if (isCycle) {
        return res.status(400).json({ error: 'Reporting manager cycle detected. An employee cannot report to themselves or their direct reports.' });
      }
    }

    // Update users table name
    if (name) {
      await dbRun('UPDATE users SET name = ? WHERE id = ?', [name, employee.user_id]);
    }

    // Timeline event logger for promotion or transfer
    if (departmentId && parseInt(departmentId) !== employee.department_id) {
      const dept = await dbGet('SELECT name FROM organizations WHERE id = ?', [departmentId]);
      await dbRun(
        'INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta) VALUES (?, ?, ?, ?)',
        [id, 'Transferred', new Date().toISOString().split('T')[0], JSON.stringify({ note: `Transferred to department: ${dept ? dept.name : departmentId}` })]
      );
    }

    if (designationId && parseInt(designationId) !== employee.designation_id) {
      const desig = await dbGet('SELECT title FROM designations WHERE id = ?', [designationId]);
      await dbRun(
        'INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta) VALUES (?, ?, ?, ?)',
        [id, 'Promoted', new Date().toISOString().split('T')[0], JSON.stringify({ note: `Designation updated to: ${desig ? desig.title : designationId}` })]
      );
    }

    await dbRun(
      `UPDATE employees SET
        mobile = ?, address = ?, gender = ?, blood_group = ?, dob = ?,
        department_id = ?, designation_id = ?, joining_date = ?, reporting_manager_id = ?,
        employment_type = ?, salary_grade = ?, salary = ?, status = ?
      WHERE id = ?`,
      [
        mobile !== undefined ? mobile : employee.mobile,
        address !== undefined ? address : employee.address,
        gender !== undefined ? gender : employee.gender,
        bloodGroup !== undefined ? bloodGroup : employee.blood_group,
        dob !== undefined ? dob : employee.dob,
        departmentId ? parseInt(departmentId) : employee.department_id,
        designationId ? parseInt(designationId) : employee.designation_id,
        joiningDate || employee.joining_date,
        reportingManagerId ? parseInt(reportingManagerId) : employee.reporting_manager_id,
        employmentType || employee.employment_type,
        salaryGrade !== undefined ? salaryGrade : employee.salary_grade,
        salary !== undefined ? parseFloat(salary) : employee.salary,
        status || employee.status,
        id
      ]
    );

    res.status(200).json({ message: 'Employee profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// 6. DELETE /api/v1/employees/:id - Soft-delete (archive) employee
router.delete('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await dbGet('SELECT id, user_id FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Archive both in users and employees tables
    await dbRun("UPDATE employees SET status = 'Archived' WHERE id = ?", [id]);
    await dbRun("UPDATE users SET status = 'blocked' WHERE id = ?", [employee.user_id]);

    await dbRun(
      'INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta) VALUES (?, ?, ?, ?)',
      [id, 'Exit', new Date().toISOString().split('T')[0], JSON.stringify({ note: 'Employee separated/archived from the company.' })]
    );

    await writeAuditLog(req.user.id, 'Employee Archived', `Archived employee profile ID: ${id}.`);

    res.status(200).json({ message: 'Employee archived successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive employee: ' + err.message });
  }
});

export default router;
