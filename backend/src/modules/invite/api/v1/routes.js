import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// 1. GET /api/v1/invites - Fetch all invites (requires invite:generate permission)
router.get('/', authenticateToken, requirePermission('invite:generate'), async (req, res) => {
  try {
    const invites = await dbAll('SELECT * FROM invites ORDER BY created_at DESC');
    res.status(200).json({ invites });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed: ' + err.message });
  }
});

// 2. POST /api/v1/invites - Create a new invite (requires invite:generate permission)
router.post('/', authenticateToken, requirePermission('invite:generate'), async (req, res) => {
  const { role, organization } = req.body;

  if (!role || !organization) {
    return res.status(400).json({ error: 'Missing role or organization parameters.' });
  }

  try {
    // Verify targeted role exists in the database
    const roleRecord = await dbGet('SELECT name FROM roles WHERE name = ?', [role]);
    if (!roleRecord) {
      return res.status(400).json({ error: `Invalid role privilege specified: '${role}' is not configured.` });
    }

    // Generate a unique code
    const code = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    await dbRun(
      'INSERT INTO invites (code, role, organization, created_by, status) VALUES (?, ?, ?, ?, ?)',
      [code, role, organization, req.user.id, 'active']
    );

    res.status(201).json({
      message: 'Invite code generated successfully.',
      invite: { code, role, organization, status: 'active' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invite: ' + err.message });
  }
});

// 3. POST /api/v1/invites/validate - Validate an invite code (Public)
router.post('/validate', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Invite code parameter is required.' });
  }

  try {
    const invite = await dbGet('SELECT * FROM invites WHERE code = ?', [code]);

    if (!invite) {
      return res.status(404).json({ error: 'Invite code not found.' });
    }

    if (invite.status !== 'active') {
      return res.status(400).json({ error: 'This invite code has already been redeemed.' });
    }

    res.status(200).json({
      valid: true,
      role: invite.role,
      organization: invite.organization
    });
  } catch (err) {
    res.status(500).json({ error: 'Database validation failed: ' + err.message });
  }
});

export default router;
