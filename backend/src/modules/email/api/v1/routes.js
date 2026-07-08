import { Router } from 'express';
import { dbAll, dbRun } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = Router();

// GET /api/v1/email/logs - Retrieve all email logs (accessible to Admin/Super Admin)
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await dbAll('SELECT * FROM email_logs ORDER BY created_at DESC');
    res.status(200).json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve simulated email logs: ' + err.message });
  }
});

// POST /api/v1/email/clear - Clear all email logs
router.post('/clear', authenticateToken, async (req, res) => {
  try {
    await dbRun('DELETE FROM email_logs');
    res.status(200).json({ message: 'Simulated email logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear simulated logs: ' + err.message });
  }
});

export default router;
