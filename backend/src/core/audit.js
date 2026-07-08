import { dbRun } from '#@/core/database.js';

export async function writeAuditLog(userId, action, details) {
  try {
    const userIdVal = userId ? parseInt(userId) : null;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
    await dbRun(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userIdVal, action, detailsStr]
    );
  } catch (err) {
    console.error('[Audit Log Error] Failed to write audit event:', err.message);
  }
}
