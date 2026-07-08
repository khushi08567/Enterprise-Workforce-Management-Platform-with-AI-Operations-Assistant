import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// 1. GET /api/v1/designations - Retrieve designations list
router.get('/', authenticateToken, requirePermission('org:read'), async (req, res) => {
  const { departmentId } = req.query;
  try {
    let query = `
      SELECT d.*, o.name as department_name,
      (SELECT COUNT(*) FROM employees e WHERE e.designation_id = d.id AND e.status = 'Active') as employee_count
      FROM designations d
      LEFT JOIN organizations o ON d.department_id = o.id
    `;
    const params = [];
    if (departmentId) {
      query += ' WHERE d.department_id = ?';
      params.push(parseInt(departmentId));
    }
    query += ' ORDER BY d.id ASC';
    const designations = await dbAll(query, params);
    res.status(200).json({ designations });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed: ' + err.message });
  }
});

// 2. POST /api/v1/designations - Create new designation
router.post('/', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { title, departmentId, level } = req.body;

  if (!title || !departmentId || !level) {
    return res.status(400).json({ error: 'Title, departmentId, and level parameters are required.' });
  }

  try {
    const dept = await dbGet('SELECT id FROM organizations WHERE id = ?', [departmentId]);
    if (!dept) {
      return res.status(404).json({ error: 'Specified department not found.' });
    }

    const result = await dbRun(
      'INSERT INTO designations (title, department_id, level) VALUES (?, ?, ?)',
      [title, parseInt(departmentId), level]
    );

    res.status(201).json({
      message: 'Designation created successfully.',
      designation: { id: result.id, title, department_id: parseInt(departmentId), level }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create designation: ' + err.message });
  }
});

// 3. PUT /api/v1/designations/:id - Edit designation
router.put('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;
  const { title, departmentId, level } = req.body;

  if (!title || !departmentId || !level) {
    return res.status(400).json({ error: 'Title, departmentId, and level parameters are required.' });
  }

  try {
    const existing = await dbGet('SELECT id FROM designations WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Designation not found.' });
    }

    const dept = await dbGet('SELECT id FROM organizations WHERE id = ?', [departmentId]);
    if (!dept) {
      return res.status(404).json({ error: 'Specified department not found.' });
    }

    await dbRun(
      'UPDATE designations SET title = ?, department_id = ?, level = ? WHERE id = ?',
      [title, parseInt(departmentId), level, id]
    );

    res.status(200).json({
      message: 'Designation updated successfully.',
      designation: { id: parseInt(id), title, department_id: parseInt(departmentId), level }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update designation: ' + err.message });
  }
});

// 4. DELETE /api/v1/designations/:id - Delete designation
router.delete('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await dbGet('SELECT id FROM designations WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Designation not found.' });
    }

    // Check if active employees hold this designation
    const assignedEmployee = await dbGet("SELECT id FROM employees WHERE designation_id = ? AND status = 'Active'", [id]);
    if (assignedEmployee) {
      return res.status(400).json({ error: 'Cannot delete designation. There are active employees holding this designation.' });
    }

    await dbRun('DELETE FROM designations WHERE id = ?', [id]);
    res.status(200).json({ message: 'Designation deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete designation: ' + err.message });
  }
});

export default router;
