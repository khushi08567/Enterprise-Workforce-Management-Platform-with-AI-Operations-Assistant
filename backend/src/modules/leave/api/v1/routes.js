import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';
import { writeAuditLog } from '#@/core/audit.js';

const router = Router();

// Helper to initialize balances for an employee
async function ensureLeaveBalances(employeeId, year) {
  const defaults = [
    { type: 'Casual', days: 12 },
    { type: 'Sick', days: 10 },
    { type: 'Earned', days: 15 }
  ];

  for (const d of defaults) {
    const existing = await dbGet(
      'SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND year = ?',
      [employeeId, d.type, year]
    );
    if (!existing) {
      await dbRun(
        'INSERT INTO leave_balances (employee_id, leave_type, max_days, used_days, year) VALUES (?, ?, ?, 0, ?)',
        [employeeId, d.type, d.days, year]
      );
    }
  }
}

// GET /api/v1/leave/balances - Get leave balances
router.get('/balances', authenticateToken, async (req, res) => {
  const currentYear = new Date().getFullYear();

  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(200).json({ balances: [] });
    }

    await ensureLeaveBalances(emp.id, currentYear);
    const balances = await dbAll('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?', [emp.id, currentYear]);
    res.status(200).json({ balances });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve balances: ' + err.message });
  }
});

// POST /api/v1/leave/apply - Apply for leave
router.post('/apply', authenticateToken, async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  const currentYear = new Date().getFullYear();

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ error: 'leaveType, startDate, and endDate parameters are required.' });
  }

  // Gate Casual/Earned paid leave types for interns
  if (req.user.role === 'Intern' && ['Casual', 'Earned'].includes(leaveType)) {
    return res.status(403).json({ 
      error: 'Access denied. Paid leave types (Casual, Earned) are restricted for interns. Please apply for Unpaid or WFH leave requests.' 
    });
  }

  // Date validation: no past dates
  const todayStr = new Date().toLocaleDateString('en-CA');
  if (startDate < todayStr) {
    return res.status(400).json({ error: 'Leave request start date cannot be in the past.' });
  }

  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    await ensureLeaveBalances(emp.id, currentYear);

    // Calculate duration in days
    const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const balance = await dbGet(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND year = ?',
      [emp.id, leaveType, currentYear]
    );

    if (!balance) {
      return res.status(400).json({ error: `No configured balances for leave type: ${leaveType}` });
    }

    if (balance.max_days - balance.used_days < diffDays) {
      return res.status(400).json({ 
        error: `Insufficient leave balance. Requested ${diffDays} days, available ${balance.max_days - balance.used_days} days.` 
      });
    }

    const result = await dbRun(`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
      VALUES (?, ?, ?, ?, ?)
    `, [emp.id, leaveType, startDate, endDate, reason]);

    res.status(201).json({ message: 'Leave request submitted successfully.', requestId: result.id, durationDays: diffDays });
  } catch (err) {
    res.status(500).json({ error: 'Leave application failed: ' + err.message });
  }
});

// GET /api/v1/leave/requests - My leave requests
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(200).json({ requests: [] });
    }

    const requests = await dbAll('SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY start_date DESC', [emp.id]);
    res.status(200).json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request log: ' + err.message });
  }
});

// GET /api/v1/leave/requests/pending - Pending approvals (for managers)
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const list = await dbAll(`
      SELECT lr.*, e.employee_id, u.name as employee_name, d.title as designation_title
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN designations d ON e.designation_id = d.id
      WHERE lr.status = 'Pending'
    `);
    res.status(200).json({ requests: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve pending approvals: ' + err.message });
  }
});

// POST /api/v1/leave/requests/:id/approve - Approve leave request
router.post('/requests/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'
  const currentYear = new Date().getFullYear();

  try {
    const request = await dbGet('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (!request) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Leave request is already finalized.' });
    }

    if (action === 'approve') {
      const diffTime = Math.abs(new Date(request.end_date) - new Date(request.start_date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Update used balance
      await dbRun(`
        UPDATE leave_balances 
        SET used_days = used_days + ? 
        WHERE employee_id = ? AND leave_type = ? AND year = ?
      `, [diffDays, request.employee_id, request.leave_type, currentYear]);

      await dbRun('UPDATE leave_requests SET status = "Approved", approved_by = ? WHERE id = ?', [req.user.id, id]);
      
      // Auto-write to employee timeline
      await dbRun(`
        INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta)
        VALUES (?, 'Leave Approved', ?, ?)
      `, [request.employee_id, new Date().toLocaleDateString('en-CA'), JSON.stringify({ leave_type: request.leave_type, days: diffDays })]);

    } else {
      await dbRun('UPDATE leave_requests SET status = "Rejected", approved_by = ? WHERE id = ?', [req.user.id, id]);
    }

    res.status(200).json({ message: `Leave request ${action}ed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to finalize request: ' + err.message });
  }
});

// POST /api/v1/leave/requests/:id/cancel - Cancel leave request
router.post('/requests/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const currentYear = new Date().getFullYear();

  try {
    const request = await dbGet('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (!request) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (request.start_date < todayStr) {
      return res.status(400).json({ error: 'Cannot cancel active or past leave schedules.' });
    }

    if (request.status === 'Approved') {
      const diffTime = Math.abs(new Date(request.end_date) - new Date(request.start_date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Restore balance
      await dbRun(`
        UPDATE leave_balances 
        SET used_days = used_days - ? 
        WHERE employee_id = ? AND leave_type = ? AND year = ?
      `, [diffDays, request.employee_id, request.leave_type, currentYear]);
    }

    await dbRun('UPDATE leave_requests SET status = "Cancelled" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Leave request cancelled and balances restored.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel request: ' + err.message });
  }
});

// GET /api/v1/leave/calendar - Team leave calendar (combines leaves + holidays)
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const leaves = await dbAll(`
      SELECT lr.start_date, lr.end_date, lr.leave_type, u.name as employee_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE lr.status = 'Approved'
    `);

    const holidays = await dbAll('SELECT date, name FROM holidays');

    res.status(200).json({ leaves, holidays });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile calendar data: ' + err.message });
  }
});

export default router;
