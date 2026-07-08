import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// 1. GET /api/v1/holidays - List holidays
router.get('/', authenticateToken, requirePermission('org:read'), async (req, res) => {
  try {
    const holidays = await dbAll(`
      SELECT h.*, o.name as department_name 
      FROM holidays h
      LEFT JOIN organizations o ON h.organization_id = o.id
      ORDER BY h.date ASC
    `);
    res.status(200).json({ holidays });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed: ' + err.message });
  }
});

// 2. POST /api/v1/holidays - Create holiday
router.post('/', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { date, name, type, organizationId } = req.body;

  if (!date || !name || !type) {
    return res.status(400).json({ error: 'Date, name, and type parameters are required.' });
  }

  const deptVal = organizationId ? parseInt(organizationId) : null;

  try {
    if (deptVal) {
      const dept = await dbGet('SELECT id FROM organizations WHERE id = ?', [deptVal]);
      if (!dept) {
        return res.status(404).json({ error: 'Specified department not found.' });
      }
    }

    // Check for duplicate date
    const duplicate = await dbGet('SELECT id FROM holidays WHERE date = ?', [date]);
    if (duplicate) {
      return res.status(409).json({ error: 'A holiday for this date is already configured.' });
    }

    const result = await dbRun(
      'INSERT INTO holidays (date, name, type, organization_id) VALUES (?, ?, ?, ?)',
      [date, name, type, deptVal]
    );

    res.status(201).json({
      message: 'Holiday created successfully.',
      holiday: { id: result.id, date, name, type, organization_id: deptVal }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create holiday: ' + err.message });
  }
});

// 3. DELETE /api/v1/holidays/:id - Delete holiday
router.delete('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await dbGet('SELECT id FROM holidays WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Holiday not found.' });
    }

    await dbRun('DELETE FROM holidays WHERE id = ?', [id]);
    res.status(200).json({ message: 'Holiday deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete holiday: ' + err.message });
  }
});

export default router;
