import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

const SYSTEM_ROLES = ['Super Admin', 'Admin', 'Employee'];
const VALID_PERMISSIONS = ['org:read', 'org:write', 'invite:generate', 'role:manage', 'user:unblock'];

// 1. GET /api/v1/roles - List all roles
router.get('/', authenticateToken, async (req, res) => {
  try {
    const roles = await dbAll('SELECT * FROM roles ORDER BY level DESC');
    // Format JSON permissions arrays for consumption
    const formattedRoles = roles.map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions)
    }));
    res.status(200).json({ roles: formattedRoles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve workspace roles: ' + err.message });
  }
});

// 2. POST /api/v1/roles - Create custom role
router.post('/', authenticateToken, requirePermission('role:manage'), async (req, res) => {
  const { name, level, permissions } = req.body;

  if (!name || level === undefined || !permissions) {
    return res.status(400).json({ error: 'Role name, hierarchy level, and permissions are required.' });
  }

  const roleName = name.trim();
  const roleLevel = parseInt(level, 10);

  if (isNaN(roleLevel) || roleLevel < 1 || roleLevel > 99) {
    return res.status(400).json({ error: 'Custom role level must be an integer between 1 and 99.' });
  }

  // Prevent privilege escalation
  if (roleLevel >= req.user.level) {
    return res.status(403).json({ 
      error: `Access denied. You cannot create a role with level (${roleLevel}) greater than or equal to your own level (${req.user.level}).` 
    });
  }

  if (!Array.isArray(permissions) || permissions.some(p => !VALID_PERMISSIONS.includes(p))) {
    return res.status(400).json({ error: 'Permissions must be a subset of valid permissions: ' + VALID_PERMISSIONS.join(', ') });
  }

  if (SYSTEM_ROLES.includes(roleName)) {
    return res.status(400).json({ error: 'System default role names cannot be reused.' });
  }

  try {
    const existingRole = await dbGet('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (existingRole) {
      return res.status(409).json({ error: `A role named "${roleName}" already exists.` });
    }

    const permissionsString = JSON.stringify(permissions);
    const result = await dbRun(
      'INSERT INTO roles (name, level, permissions) VALUES (?, ?, ?)',
      [roleName, roleLevel, permissionsString]
    );

    res.status(201).json({
      message: `Custom role "${roleName}" created successfully.`,
      role: { id: result.id, name: roleName, level: roleLevel, permissions }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record custom role: ' + err.message });
  }
});

// 3. PUT /api/v1/roles/:id - Edit custom role
router.put('/:id', authenticateToken, requirePermission('role:manage'), async (req, res) => {
  const { id } = req.params;
  const { name, level, permissions } = req.body;

  if (!name || level === undefined || !permissions) {
    return res.status(400).json({ error: 'Role name, hierarchy level, and permissions are required.' });
  }

  const roleName = name.trim();
  const roleLevel = parseInt(level, 10);

  if (isNaN(roleLevel) || roleLevel < 1 || roleLevel > 99) {
    return res.status(400).json({ error: 'Custom role level must be an integer between 1 and 99.' });
  }

  // Prevent privilege escalation
  if (roleLevel >= req.user.level) {
    return res.status(403).json({ 
      error: `Access denied. You cannot set a role level (${roleLevel}) greater than or equal to your own level (${req.user.level}).` 
    });
  }

  if (!Array.isArray(permissions) || permissions.some(p => !VALID_PERMISSIONS.includes(p))) {
    return res.status(400).json({ error: 'Invalid permissions configuration.' });
  }

  try {
    const targetRole = await dbGet('SELECT * FROM roles WHERE id = ?', [id]);
    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (SYSTEM_ROLES.includes(targetRole.name)) {
      return res.status(403).json({ error: 'System default roles cannot be modified.' });
    }

    // Check if user has hierarchy over target role
    if (targetRole.level >= req.user.level) {
      return res.status(403).json({ 
        error: `Access denied. You cannot modify a role with level (${targetRole.level}) greater than or equal to your own level (${req.user.level}).` 
      });
    }

    const permissionsString = JSON.stringify(permissions);
    await dbRun(
      'UPDATE roles SET name = ?, level = ?, permissions = ? WHERE id = ?',
      [roleName, roleLevel, permissionsString, id]
    );

    res.status(200).json({
      message: `Custom role updated successfully.`,
      role: { id: parseInt(id, 10), name: roleName, level: roleLevel, permissions }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update custom role: ' + err.message });
  }
});

// 4. DELETE /api/v1/roles/:id - Delete custom role
router.delete('/:id', authenticateToken, requirePermission('role:manage'), async (req, res) => {
  const { id } = req.params;

  try {
    const targetRole = await dbGet('SELECT * FROM roles WHERE id = ?', [id]);
    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (SYSTEM_ROLES.includes(targetRole.name)) {
      return res.status(403).json({ error: 'System default roles cannot be deleted.' });
    }

    // Check if user has hierarchy over target role
    if (targetRole.level >= req.user.level) {
      return res.status(403).json({ 
        error: `Access denied. You cannot delete a role with level (${targetRole.level}) greater than or equal to your own level (${req.user.level}).` 
      });
    }

    // Check if users are currently assigned to this role
    const assignedUser = await dbGet('SELECT id FROM users WHERE role = ? LIMIT 1', [targetRole.name]);
    if (assignedUser) {
      return res.status(400).json({ 
        error: `Cannot delete role "${targetRole.name}". There are active users currently assigned to this role.` 
      });
    }

    await dbRun('DELETE FROM roles WHERE id = ?', [id]);
    res.status(200).json({ message: `Role "${targetRole.name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete custom role: ' + err.message });
  }
});

export default router;
