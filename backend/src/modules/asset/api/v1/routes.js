import express from 'express';
import { dbAll, dbGet, dbRun } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = express.Router();

// Get personal self-service assets list
router.get('/my', authenticateToken, async (req, res) => {
  try {
    // Find employee linked to user account
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) return res.status(200).json({ assets: [] });

    const assets = await dbAll('SELECT * FROM assets WHERE assigned_to = ?', [emp.id]);
    res.status(200).json({ assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Asset Directory Listing
router.get('/', authenticateToken, async (req, res) => {
  const { type, status } = req.query;
  let sql = `
    SELECT a.*, u.name as assignee_name 
    FROM assets a
    LEFT JOIN employees e ON a.assigned_to = e.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (type) {
    sql += ' AND a.type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }

  try {
    const assets = await dbAll(sql, params);
    res.status(200).json({ assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, type, assetTag, serialNumber, purchaseDate, purchaseCost, warrantyExpiry } = req.body;
  if (!name || !type || !assetTag) {
    return res.status(400).json({ error: 'Name, type, and asset tag are required.' });
  }
  try {
    const result = await dbRun(
      `INSERT INTO assets (name, type, asset_tag, serial_number, purchase_date, purchase_cost, warranty_expiry, status, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', NULL)`,
      [name, type, assetTag, serialNumber, purchaseDate, purchaseCost ? parseFloat(purchaseCost) : 0, warrantyExpiry]
    );
    res.status(201).json({ message: 'Asset registered.', assetId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkout/Assign Asset
router.post('/:id/assign', authenticateToken, async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'Employee ID is required.' });

  try {
    const asset = await dbGet('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });
    if (asset.status !== 'Available') {
      return res.status(400).json({ error: 'Asset is not available for assignment.' });
    }

    await dbRun(
      'UPDATE assets SET status = "Assigned", assigned_to = ? WHERE id = ?',
      [employeeId, req.params.id]
    );

    await dbRun(
      'INSERT INTO asset_history (asset_id, employee_id, action, condition_note) VALUES (?, ?, "Assign", "Checkout assigned")',
      [req.params.id, employeeId]
    );

    res.status(200).json({ message: 'Asset assigned successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check-in/Return Asset
router.post('/:id/return', authenticateToken, async (req, res) => {
  const { conditionNote } = req.body;

  try {
    const asset = await dbGet('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ error: 'Asset not found.' });

    const prevHolder = asset.assigned_to;

    await dbRun(
      'UPDATE assets SET status = "Available", assigned_to = NULL WHERE id = ?',
      [req.params.id]
    );

    await dbRun(
      'INSERT INTO asset_history (asset_id, employee_id, action, condition_note) VALUES (?, ?, "Return", ?)',
      [req.params.id, prevHolder, conditionNote || 'Returned in good condition']
    );

    res.status(200).json({ message: 'Asset returned successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send under repair
router.post('/:id/repair', authenticateToken, async (req, res) => {
  const { reason } = req.body;
  try {
    await dbRun('UPDATE assets SET status = "Under Repair" WHERE id = ?', [req.params.id]);
    await dbRun(
      'INSERT INTO asset_history (asset_id, employee_id, action, condition_note) VALUES (?, NULL, "Repair", ?)',
      [req.params.id, reason || 'Sent for diagnostic check']
    );
    res.status(200).json({ message: 'Asset status set to Under Repair.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const history = await dbAll(`
      SELECT h.*, u.name as employee_name 
      FROM asset_history h
      LEFT JOIN employees e ON h.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE h.asset_id = ?
      ORDER BY h.created_at DESC
    `, [req.params.id]);
    res.status(200).json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
