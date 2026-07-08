import { Router } from 'express';
import { dbAll } from '#@/core/database.js';
import { authenticateToken } from '#@/core/middleware/auth.js';

const router = Router();

// GET /api/v1/audit-logs - Retrieve last 100 audit events (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Access denied. Audit logs are restricted to system administrators.' });
  }
  
  try {
    const logs = await dbAll(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 150
    `);
    res.status(200).json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit events: ' + err.message });
  }
});

export default router;
