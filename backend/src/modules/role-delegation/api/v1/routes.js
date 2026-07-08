import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = Router();

// GET /api/v1/role-delegation-policies - Fetch delegations
router.get('/', authenticateToken, async (req, res) => {
  try {
    let delegations;
    const isPrivileged = req.user.role === 'Super Admin' || req.user.permissions.includes('role:manage');

    if (isPrivileged) {
      delegations = await dbAll(`
        SELECT rd.*, u1.name as from_name, u2.name as to_name 
        FROM role_delegations rd
        JOIN users u1 ON rd.delegate_from_id = u1.id
        JOIN users u2 ON rd.delegate_to_id = u2.id
        ORDER BY rd.created_at DESC
      `);
    } else {
      delegations = await dbAll(`
        SELECT rd.*, u1.name as from_name, u2.name as to_name 
        FROM role_delegations rd
        JOIN users u1 ON rd.delegate_from_id = u1.id
        JOIN users u2 ON rd.delegate_to_id = u2.id
        WHERE rd.delegate_from_id = ? OR rd.delegate_to_id = ?
        ORDER BY rd.created_at DESC
      `, [req.user.id, req.user.id]);
    }

    res.status(200).json({ delegations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve delegations: ' + err.message });
  }
});

// POST /api/v1/role-delegation-policies - Create temporary delegation
router.post('/', authenticateToken, async (req, res) => {
  const { delegateToId, roleName, startDate, endDate } = req.body;

  if (!delegateToId || !roleName || !startDate || !endDate) {
    return res.status(400).json({ error: 'Delegate Target, Role, Start Date, and End Date are required.' });
  }

  try {
    // 1. Verify target user exists
    const targetUser = await dbGet('SELECT name FROM users WHERE id = ?', [delegateToId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    // 2. Fetch targeted role level
    const roleRecord = await dbGet('SELECT level FROM roles WHERE name = ?', [roleName]);
    if (!roleRecord) {
      return res.status(400).json({ error: `Role '${roleName}' does not exist.` });
    }

    // 3. Hierarchy protection check: Cannot delegate a role level > current user's level
    if (roleRecord.level > req.user.level) {
      return res.status(403).json({ 
        error: `Access denied. You cannot delegate a role level (${roleRecord.level}) higher than your own level (${req.user.level}).` 
      });
    }

    // 4. Save the delegation policy
    const result = await dbRun(`
      INSERT INTO role_delegations (delegate_from_id, delegate_to_id, role_name, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [req.user.id, delegateToId, roleName, startDate, endDate]);

    res.status(201).json({
      message: `Role "${roleName}" successfully delegated to user "${targetUser.name}" from ${startDate} to ${endDate}.`,
      delegation: { id: result.id, delegate_from_id: req.user.id, delegate_to_id: delegateToId, role_name: roleName, start_date: startDate, end_date: endDate, status: 'active' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to establish delegation policy: ' + err.message });
  }
});

// DELETE /api/v1/role-delegation-policies/:id - Cancel/Revoke delegation
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const delegation = await dbGet('SELECT * FROM role_delegations WHERE id = ?', [id]);
    if (!delegation) {
      return res.status(404).json({ error: 'Delegation policy not found.' });
    }

    // Check authority: must be the delegator or have role:manage permission
    const isAuthorized = delegation.delegate_from_id === req.user.id || req.user.permissions.includes('role:manage');
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to revoke this delegation.' });
    }

    await dbRun("UPDATE role_delegations SET status = 'cancelled' WHERE id = ?", [id]);
    res.status(200).json({ message: 'Delegation policy successfully cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel delegation: ' + err.message });
  }
});

export default router;
