import jwt from 'jsonwebtoken';
import { dbGet } from '#@/core/database';

const JWT_SECRET = process.env.JWT_SECRET || 'WFM_SECRET_KEY_2026';

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 1. Fetch latest user status and role from DB
    const dbUser = await dbGet('SELECT id, status, role FROM users WHERE id = ?', [decoded.id]);
    if (!dbUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    
    if (dbUser.status === 'blocked') {
      return res.status(403).json({ error: 'Access denied. User account is blocked.' });
    }

    // 1.1 Check for active role delegations
    let activeRole = dbUser.role;
    const delegation = await dbGet(
      `SELECT role_name FROM role_delegations 
       WHERE delegate_to_id = ? AND status = 'active' AND ? BETWEEN start_date AND end_date
       ORDER BY created_at DESC LIMIT 1`,
      [dbUser.id, new Date().toISOString()]
    );

    if (delegation) {
      activeRole = delegation.role_name;
      console.log(`[Delegation Active] User ID ${dbUser.id} is temporarily acting as ${activeRole}`);
    }

    // 2. Fetch role permissions and hierarchy level
    const roleDetails = await dbGet('SELECT level, permissions FROM roles WHERE name = ?', [activeRole]);
    if (!roleDetails) {
      return res.status(403).json({ error: `Access denied. Role '${activeRole}' is not configured in the database.` });
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: activeRole,
      originalRole: dbUser.role,
      organization: decoded.organization,
      level: roleDetails.level,
      permissions: JSON.parse(roleDetails.permissions)
    };

    // Allow Admins/Super Admins to override/impersonate another role
    const impersonateHeader = req.headers['x-impersonate-role'];
    if (impersonateHeader && ['Super Admin', 'Admin'].includes(dbUser.role)) {
      req.user.role = impersonateHeader;
      const impRoleDetails = await dbGet('SELECT level, permissions FROM roles WHERE name = ?', [impersonateHeader]);
      if (impRoleDetails) {
        req.user.level = impRoleDetails.level;
        req.user.permissions = JSON.parse(impRoleDetails.permissions);
      }
    }

    next();
  } catch (err) {
    console.error('[JWT Auth Error]:', err);
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Middleware to check user roles (Backwards compatibility)
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' is not authorized for this action.` 
      });
    }

    next();
  };
};

// Middleware to check action permissions dynamically
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: `Access denied. Action requires '${permission}' permission.` 
      });
    }

    next();
  };
};

export {
  authenticateToken,
  requireRole,
  requirePermission,
  JWT_SECRET
};
