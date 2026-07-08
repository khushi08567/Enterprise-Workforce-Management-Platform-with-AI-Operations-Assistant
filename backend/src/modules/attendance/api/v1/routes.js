import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';
import { writeAuditLog } from '#@/core/audit.js';

const router = Router();

// Haversine formula to compute distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// POST /api/v1/attendance/clock-in - Clock in
router.post('/clock-in', authenticateToken, async (req, res) => {
  const { latitude, longitude, method } = req.body; // coordinates of clock-in client
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const emp = await dbGet('SELECT * FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(404).json({ error: 'Employee record not found for this user.' });
    }

    const existing = await dbGet('SELECT id FROM attendance WHERE employee_id = ? AND date = ?', [emp.id, todayStr]);
    if (existing) {
      return res.status(400).json({ error: 'You have already clocked in for today.' });
    }

    // 1. GPS Verification against assigned office
    let status = 'Present';
    let isRemote = false;

    if (emp.office_location_id) {
      const office = await dbGet('SELECT * FROM office_locations WHERE id = ?', [emp.office_location_id]);
      if (office && latitude && longitude) {
        const distance = getDistanceMeters(latitude, longitude, office.geo_lat, office.geo_lng);
        if (distance > office.geo_radius_meters) {
          status = 'Remote';
          isRemote = true;
        }
      } else {
        // No coordinates provided or no matches
        status = 'Remote';
        isRemote = true;
      }
    }

    // 2. Grace Period Late Check (if not remote/wfh)
    const now = new Date();
    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const clockInTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}`;

    if (!isRemote && emp.work_shift_id) {
      const shift = await dbGet('SELECT * FROM work_shifts WHERE id = ?', [emp.work_shift_id]);
      if (shift) {
        const [sHours, sMins] = shift.start_time.split(':').map(Number);
        const shiftStartMins = sHours * 60 + sMins;
        const clockMins = currentHours * 60 + currentMins;
        
        if (clockMins > shiftStartMins + (shift.grace_period_minutes || 15)) {
          status = 'Late';
        }
      }
    }

    const geoStr = latitude && longitude ? `${latitude},${longitude}` : 'N/A';

    await dbRun(`
      INSERT INTO attendance (employee_id, date, clock_in, status, geo_location, method)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [emp.id, todayStr, clockInTimeStr, status, geoStr, method || 'web']);

    res.status(200).json({ message: 'Clock-in recorded successfully.', time: clockInTimeStr, status });
  } catch (err) {
    res.status(500).json({ error: 'Clock-in transaction failed: ' + err.message });
  }
});

// POST /api/v1/attendance/clock-out - Clock out
router.post('/clock-out', authenticateToken, async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const emp = await dbGet('SELECT * FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(404).json({ error: 'Employee record not found.' });
    }

    const attendance = await dbGet('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [emp.id, todayStr]);
    if (!attendance) {
      return res.status(400).json({ error: 'No active clock-in recorded for today.' });
    }

    if (attendance.clock_out) {
      return res.status(400).json({ error: 'You have already clocked out for today.' });
    }

    const now = new Date();
    const clockOutTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Calculate working hours
    const [inH, inM] = attendance.clock_in.split(':').map(Number);
    const outH = now.getHours();
    const outM = now.getMinutes();

    const hours = (outH * 60 + outM - (inH * 60 + inM)) / 60;
    const finalHours = Math.round(hours * 100) / 100;

    await dbRun(`
      UPDATE attendance 
      SET clock_out = ?, working_hours = ? 
      WHERE id = ?
    `, [clockOutTimeStr, finalHours, attendance.id]);

    res.status(200).json({ message: 'Clock-out recorded successfully.', time: clockOutTimeStr, hours: finalHours });
  } catch (err) {
    res.status(500).json({ error: 'Clock-out transaction failed: ' + err.message });
  }
});

// GET /api/v1/attendance/history - Get attendance log history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(200).json({ attendance: [] });
    }

    const logs = await dbAll('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC', [emp.id]);
    res.status(200).json({ attendance: logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs: ' + err.message });
  }
});

// POST /api/v1/attendance/corrections - Request correction (Employee only)
router.post('/corrections', authenticateToken, async (req, res) => {
  const { date, requestedClockIn, requestedClockOut, reason } = req.body;

  if (!date || !requestedClockIn || !requestedClockOut) {
    return res.status(400).json({ error: 'date, requestedClockIn, and requestedClockOut parameters are required.' });
  }

  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    // Find attendance row if exists
    const att = await dbGet('SELECT id FROM attendance WHERE employee_id = ? AND date = ?', [emp.id, date]);

    await dbRun(`
      INSERT INTO attendance_corrections (attendance_id, employee_id, date, requested_clock_in, requested_clock_out, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [att ? att.id : null, emp.id, date, requestedClockIn, requestedClockOut, reason]);

    res.status(201).json({ message: 'Correction request submitted for approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Correction submission failed: ' + err.message });
  }
});

// GET /api/v1/attendance/corrections/pending - Pending approvals list
router.get('/corrections/pending', authenticateToken, async (req, res) => {
  try {
    const list = await dbAll(`
      SELECT ac.*, e.employee_id, u.name as employee_name, d.title as designation_title
      FROM attendance_corrections ac
      JOIN employees e ON ac.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN designations d ON e.designation_id = d.id
      WHERE ac.status = 'Pending'
    `);
    res.status(200).json({ corrections: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve corrections list: ' + err.message });
  }
});

// POST /api/v1/attendance/corrections/:id/approve - Approve attendance adjustments
router.post('/corrections/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  try {
    const corr = await dbGet('SELECT * FROM attendance_corrections WHERE id = ?', [id]);
    if (!corr) {
      return res.status(404).json({ error: 'Correction request not found.' });
    }

    if (action === 'approve') {
      const [inH, inM] = corr.requested_clock_in.split(':').map(Number);
      const [outH, outM] = corr.requested_clock_out.split(':').map(Number);
      const hours = (outH * 60 + outM - (inH * 60 + inM)) / 60;
      const finalHours = Math.round(hours * 100) / 100;

      if (corr.attendance_id) {
        await dbRun(`
          UPDATE attendance 
          SET clock_in = ?, clock_out = ?, working_hours = ?, status = 'Present'
          WHERE id = ?
        `, [corr.requested_clock_in, corr.requested_clock_out, finalHours, corr.attendance_id]);
      } else {
        await dbRun(`
          INSERT INTO attendance (employee_id, date, clock_in, clock_out, working_hours, status, method)
          VALUES (?, ?, ?, ?, ?, 'Present', 'Correction')
        `, [corr.employee_id, corr.date, corr.requested_clock_in, corr.requested_clock_out, finalHours]);
      }

      await dbRun('UPDATE attendance_corrections SET status = "Approved", approved_by = ? WHERE id = ?', [req.user.id, id]);
    } else {
      await dbRun('UPDATE attendance_corrections SET status = "Rejected", approved_by = ? WHERE id = ?', [req.user.id, id]);
    }

    res.status(200).json({ message: `Correction request ${action}ed.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process correction: ' + err.message });
  }
});

// GET /api/v1/attendance/reports - Monthly reports
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await dbAll(`
      SELECT a.*, e.employee_id, u.name as employee_name, d.name as department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN organizations d ON e.department_id = d.id
      ORDER BY a.date DESC
    `);
    res.status(200).json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile report: ' + err.message });
  }
});

export default router;
