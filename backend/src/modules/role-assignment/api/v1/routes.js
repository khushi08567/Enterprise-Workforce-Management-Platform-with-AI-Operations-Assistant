import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// GET /api/v1/role-assignment-policies - List all user roles (requires role:manage permission)
router.get('/', authenticateToken, requirePermission('role:manage'), async (req, res) => {
  try {
    const users = await dbAll('SELECT id, name, email, role, status FROM users ORDER BY name ASC');
    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve role assignments: ' + err.message });
  }
});

// POST /api/v1/role-assignment-policies - Assign a role to a user (requires role:manage permission)
router.post('/', authenticateToken, requirePermission('role:manage'), async (req, res) => {
  const { userId, roleName } = req.body;

  if (!userId || !roleName) {
    return res.status(400).json({ error: 'User ID and Role Name are required.' });
  }

  try {
    // 1. Fetch targeted user
    const targetUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 2. Fetch targeted role level
    const roleRecord = await dbGet('SELECT name, level FROM roles WHERE name = ?', [roleName]);
    if (!roleRecord) {
      return res.status(400).json({ error: `Role '${roleName}' does not exist.` });
    }

    // 3. Hierarchy checks: Cannot assign a role level >= current user's level!
    if (roleRecord.level >= req.user.level) {
      return res.status(403).json({ 
        error: `Access denied. You cannot assign a role with level (${roleRecord.level}) greater than or equal to your own level (${req.user.level}).` 
      });
    }

    // 4. Update the user role in the users table
    await dbRun('UPDATE users SET role = ? WHERE id = ?', [roleName, userId]);

    // 5. Log the assignment
    await dbRun(
      'INSERT INTO role_assignments (user_id, role_name, assigned_by) VALUES (?, ?, ?)',
      [userId, roleName, req.user.id]
    );

    res.status(200).json({ message: `Successfully assigned role "${roleName}" to user "${targetUser.name}".` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign role: ' + err.message });
  }
});

export default router;
