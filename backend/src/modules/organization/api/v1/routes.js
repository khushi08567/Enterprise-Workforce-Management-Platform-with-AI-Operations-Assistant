import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// Cycle detection utility for department hierarchy
async function wouldCreateCycle(deptId, newParentId) {
  if (!newParentId) return false;
  if (parseInt(deptId) === parseInt(newParentId)) return true;
  let currentParentId = parseInt(newParentId);
  while (currentParentId) {
    const parentNode = await dbGet('SELECT parent_id FROM organizations WHERE id = ?', [currentParentId]);
    if (!parentNode) break;
    if (parentNode.parent_id !== null && parseInt(parentNode.parent_id) === parseInt(deptId)) {
      return true;
    }
    currentParentId = parentNode.parent_id;
  }
  return false;
}

// 1. GET /api/v1/organizations - Retrieve flat organization nodes list
router.get('/', authenticateToken, requirePermission('org:read'), async (req, res) => {
  try {
    const orgs = await dbAll(`
      SELECT o.*, u.name as manager_name,
      (SELECT COUNT(*) FROM employees e WHERE e.department_id = o.id AND e.status = 'Active') as employee_count
      FROM organizations o
      LEFT JOIN users u ON o.manager_id = u.id
      ORDER BY o.id ASC
    `);
    res.status(200).json({ organizations: orgs });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed: ' + err.message });
  }
});

// 2. POST /api/v1/organizations - Add new organization node (requires org:write permission)
router.post('/', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { name, code, parentId, managerId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Organization name parameter is required.' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Department code is required.' });
  }

  try {
    // Check for duplicate names
    const duplicateName = await dbGet('SELECT id FROM organizations WHERE name = ?', [name]);
    if (duplicateName) {
      return res.status(409).json({ error: 'A department with this name already exists.' });
    }

    // Check for duplicate codes
    const duplicateCode = await dbGet('SELECT id FROM organizations WHERE code = ?', [code]);
    if (duplicateCode) {
      return res.status(409).json({ error: 'A department with this code already exists.' });
    }

    // If parentId is provided, check if parent node exists
    if (parentId) {
      const parentNode = await dbGet('SELECT id FROM organizations WHERE id = ?', [parentId]);
      if (!parentNode) {
        return res.status(404).json({ error: 'Specified parent department node not found.' });
      }
    }

    // If managerId is provided, check if user exists
    if (managerId) {
      const managerUser = await dbGet('SELECT id FROM users WHERE id = ?', [managerId]);
      if (!managerUser) {
        return res.status(404).json({ error: 'Specified manager user not found.' });
      }
    }

    const parentVal = parentId ? parseInt(parentId) : null;
    const managerVal = managerId ? parseInt(managerId) : null;

    const result = await dbRun(
      'INSERT INTO organizations (name, code, parent_id, manager_id, status) VALUES (?, ?, ?, ?, ?)',
      [name, code, parentVal, managerVal, 'Active']
    );

    res.status(201).json({
      message: 'Organization node registered successfully.',
      organization: { id: result.id, name, code, parent_id: parentVal, manager_id: managerVal, status: 'Active' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create organization node: ' + err.message });
  }
});

// 3. PUT /api/v1/organizations/:id - Edit organization node (requires org:write permission)
router.put('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;
  const { name, code, parentId, managerId, status } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Organization name parameter is required.' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Department code is required.' });
  }

  try {
    const existingNode = await dbGet('SELECT * FROM organizations WHERE id = ?', [id]);
    if (!existingNode) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    // Check duplicate name (excluding itself)
    const duplicateName = await dbGet('SELECT id FROM organizations WHERE name = ? AND id != ?', [name, id]);
    if (duplicateName) {
      return res.status(409).json({ error: 'Another department already uses this name.' });
    }

    // Check duplicate code (excluding itself)
    const duplicateCode = await dbGet('SELECT id FROM organizations WHERE code = ? AND id != ?', [code, id]);
    if (duplicateCode) {
      return res.status(409).json({ error: 'Another department already uses this code.' });
    }

    // If parentId is provided, check if parent node exists
    const parentVal = parentId ? parseInt(parentId) : null;
    if (parentVal) {
      const parentNode = await dbGet('SELECT id FROM organizations WHERE id = ?', [parentVal]);
      if (!parentNode) {
        return res.status(404).json({ error: 'Specified parent department not found.' });
      }

      // Cycle Check!
      const isCycle = await wouldCreateCycle(id, parentVal);
      if (isCycle) {
        return res.status(400).json({ error: 'Hierarchy cycle detected. A node cannot report to itself or its descendants.' });
      }
    }

    // If managerId is provided, check if user exists
    const managerVal = managerId ? parseInt(managerId) : null;
    if (managerVal) {
      const managerUser = await dbGet('SELECT id FROM users WHERE id = ?', [managerVal]);
      if (!managerUser) {
        return res.status(404).json({ error: 'Specified manager user not found.' });
      }
    }

    const statusVal = status || 'Active';

    // If archiving/disabling, check if employees are assigned
    if (statusVal === 'Archived') {
      const assignedEmployee = await dbGet("SELECT id FROM employees WHERE department_id = ? AND status = 'Active'", [id]);
      if (assignedEmployee) {
        return res.status(400).json({ error: 'Cannot archive department. There are active employees currently assigned to it.' });
      }
    }

    await dbRun(
      'UPDATE organizations SET name = ?, code = ?, parent_id = ?, manager_id = ?, status = ? WHERE id = ?',
      [name, code, parentVal, managerVal, statusVal, id]
    );

    res.status(200).json({
      message: 'Department updated successfully.',
      organization: { id: parseInt(id), name, code, parent_id: parentVal, manager_id: managerVal, status: statusVal }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department: ' + err.message });
  }
});

// 4. DELETE /api/v1/organizations/:id - Delete/Archive organization node (requires org:write permission)
router.delete('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;

  try {
    const existingNode = await dbGet('SELECT id FROM organizations WHERE id = ?', [id]);
    if (!existingNode) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    // 1. Check if there are child sub-departments
    const childNode = await dbGet('SELECT id FROM organizations WHERE parent_id = ?', [id]);
    if (childNode) {
      return res.status(400).json({ error: 'Cannot delete/archive. This department has active sub-departments.' });
    }

    // 2. Check if there are active employees assigned
    const assignedEmployee = await dbGet("SELECT id FROM employees WHERE department_id = ? AND status = 'Active'", [id]);
    if (assignedEmployee) {
      return res.status(400).json({ error: 'Cannot delete/archive. There are active employees currently assigned to this department.' });
    }

    // Perform soft delete (Archive)
    await dbRun("UPDATE organizations SET status = 'Archived' WHERE id = ?", [id]);

    res.status(200).json({ message: 'Department archived successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive department: ' + err.message });
  }
});

export default router;
