import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// 1. GET /api/v1/work-shifts - List shifts
router.get('/', authenticateToken, requirePermission('org:read'), async (req, res) => {
  try {
    const shifts = await dbAll(`
      SELECT s.*, o.name as department_name 
      FROM work_shifts s
      LEFT JOIN organizations o ON s.organization_id = o.id
      ORDER BY s.id ASC
    `);
    res.status(200).json({ shifts });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed: ' + err.message });
  }
});

// 2. POST /api/v1/work-shifts - Create shift
router.post('/', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { name, startTime, endTime, gracePeriodMinutes, organizationId } = req.body;

  if (!name || !startTime || !endTime || !organizationId) {
    return res.status(400).json({ error: 'Name, startTime, endTime, and organizationId parameters are required.' });
  }

  const grace = gracePeriodMinutes !== undefined ? parseInt(gracePeriodMinutes) : 15;

  try {
    const dept = await dbGet('SELECT id FROM organizations WHERE id = ?', [organizationId]);
    if (!dept) {
      return res.status(404).json({ error: 'Specified department not found.' });
    }

    const result = await dbRun(
      'INSERT INTO work_shifts (name, start_time, end_time, grace_period_minutes, organization_id) VALUES (?, ?, ?, ?, ?)',
      [name, startTime, endTime, grace, parseInt(organizationId)]
    );

    res.status(201).json({
      message: 'Work shift created successfully.',
      shift: { id: result.id, name, start_time: startTime, end_time: endTime, grace_period_minutes: grace, organization_id: parseInt(organizationId) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create work shift: ' + err.message });
  }
});

// 3. PUT /api/v1/work-shifts/:id - Edit shift
router.put('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;
  const { name, startTime, endTime, gracePeriodMinutes, organizationId } = req.body;

  if (!name || !startTime || !endTime || !organizationId) {
    return res.status(400).json({ error: 'Name, startTime, endTime, and organizationId parameters are required.' });
  }

  const grace = gracePeriodMinutes !== undefined ? parseInt(gracePeriodMinutes) : 15;

  try {
    const existing = await dbGet('SELECT id FROM work_shifts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Work shift not found.' });
    }

    const dept = await dbGet('SELECT id FROM organizations WHERE id = ?', [organizationId]);
    if (!dept) {
      return res.status(404).json({ error: 'Specified department not found.' });
    }

    await dbRun(
      'UPDATE work_shifts SET name = ?, start_time = ?, end_time = ?, grace_period_minutes = ?, organization_id = ? WHERE id = ?',
      [name, startTime, endTime, grace, parseInt(organizationId), id]
    );

    res.status(200).json({
      message: 'Work shift updated successfully.',
      shift: { id: parseInt(id), name, start_time: startTime, end_time: endTime, grace_period_minutes: grace, organization_id: parseInt(organizationId) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update work shift: ' + err.message });
  }
});

// 4. DELETE /api/v1/work-shifts/:id - Delete shift
router.delete('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await dbGet('SELECT id FROM work_shifts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Work shift not found.' });
    }

    await dbRun('DELETE FROM work_shifts WHERE id = ?', [id]);
    res.status(200).json({ message: 'Work shift deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete work shift: ' + err.message });
  }
});

export default router;
