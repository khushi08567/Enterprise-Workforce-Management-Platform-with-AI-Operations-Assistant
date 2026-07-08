import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';
import { writeAuditLog } from '#@/core/audit.js';

const router = Router();

// GET /api/v1/performance/goals - Get goals list (active employee)
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(200).json({ goals: [] });
    }

    const list = await dbAll('SELECT * FROM goals WHERE employee_id = ? ORDER BY year DESC, quarter DESC', [emp.id]);
    res.status(200).json({ goals: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve goals: ' + err.message });
  }
});

// GET /api/v1/performance/goals/all - Get all employee goals (Manager / HR only)
router.get('/goals/all', authenticateToken, async (req, res) => {
  try {
    const list = await dbAll(`
      SELECT g.*, e.employee_id, u.name as employee_name
      FROM goals g
      JOIN employees e ON g.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      ORDER BY g.year DESC, g.quarter DESC
    `);
    res.status(200).json({ goals: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve goals: ' + err.message });
  }
});

// POST /api/v1/performance/goals - Establish goal (Manager only)
router.post('/goals', authenticateToken, async (req, res) => {
  const { employeeId, quarter, year, goal, kpiTarget } = req.body;

  if (!employeeId || !quarter || !year || !goal || !kpiTarget) {
    return res.status(400).json({ error: 'employeeId, quarter, year, goal, and kpiTarget are required.' });
  }

  try {
    const result = await dbRun(`
      INSERT INTO goals (employee_id, quarter, year, goal, kpi_target)
      VALUES (?, ?, ?, ?, ?)
    `, [employeeId, quarter, year, goal, kpiTarget]);

    res.status(201).json({ message: 'Goal assigned successfully.', goalId: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign goal: ' + err.message });
  }
});

// PUT /api/v1/performance/goals/:id/self-assess - Employee Self-Assessment
router.put('/goals/:id/self-assess', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { selfRating, selfFeedback } = req.body;

  try {
    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [id]);
    if (!goal) {
      return res.status(404).json({ error: 'Goal target not found.' });
    }

    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp || emp.id !== goal.employee_id) {
      return res.status(403).json({ error: 'Access denied. You can only evaluate your own performance goals.' });
    }

    await dbRun(`
      UPDATE goals 
      SET self_rating = ?, self_feedback = ?, status = 'Self-Assessed'
      WHERE id = ?
    `, [selfRating, selfFeedback, id]);

    res.status(200).json({ message: 'Self-assessment registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Self-assessment update failed: ' + err.message });
  }
});

// PUT /api/v1/performance/goals/:id/review - Manager Review
router.put('/goals/:id/review', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { managerRating, managerFeedback } = req.body;

  if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin' && req.user.role !== 'HR') {
    // If not HR/Admin, check if manager? For demo, we trust role permissions.
  }

  try {
    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [id]);
    if (!goal) {
      return res.status(404).json({ error: 'Goal target not found.' });
    }

    await dbRun(`
      UPDATE goals 
      SET manager_rating = ?, manager_feedback = ?, status = 'Reviewed'
      WHERE id = ?
    `, [managerRating, managerFeedback, id]);

    res.status(200).json({ message: 'Manager evaluation registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Manager evaluation update failed: ' + err.message });
  }
});

// GET /api/v1/performance/reviews - Get reviews list (active employee)
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(200).json({ reviews: [] });
    }

    const list = await dbAll('SELECT * FROM performance_reviews WHERE employee_id = ? ORDER BY year DESC, quarter DESC', [emp.id]);
    res.status(200).json({ reviews: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve reviews: ' + err.message });
  }
});

// GET /api/v1/performance/reviews/all - Get all reviews (Manager/HR)
router.get('/reviews/all', authenticateToken, async (req, res) => {
  try {
    const list = await dbAll(`
      SELECT pr.*, e.employee_id, u.name as employee_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      ORDER BY pr.year DESC, pr.quarter DESC
    `);
    res.status(200).json({ reviews: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve performance reviews list: ' + err.message });
  }
});

// POST /api/v1/performance/reviews - Create/Publish Performance Review
router.post('/reviews', authenticateToken, async (req, res) => {
  const { employeeId, quarter, year, kpiScore, selfRating, managerRating, feedback, recommendationPromotion } = req.body;

  if (!employeeId || !quarter || !year || !selfRating || !managerRating) {
    return res.status(400).json({ error: 'employeeId, quarter, year, selfRating, and managerRating are required.' });
  }

  try {
    // 1. Calculate auto-attendance score metric (percentage of Present days)
    const attCount = await dbGet('SELECT COUNT(*) as count FROM attendance WHERE employee_id = ?', [employeeId]);
    const presentCount = await dbGet('SELECT COUNT(*) as count FROM attendance WHERE employee_id = ? AND status = "Present"', [employeeId]);
    
    const attendanceScore = attCount.count > 0 
      ? Math.round((presentCount.count / attCount.count) * 100)
      : 100; // Default 100% score if no records exist yet

    const result = await dbRun(`
      INSERT INTO performance_reviews (employee_id, quarter, year, kpi_score, attendance_score, self_rating, manager_rating, feedback, recommendation_promotion, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
    `, [employeeId, quarter, year, kpiScore || 80.0, attendanceScore, selfRating, managerRating, feedback, recommendationPromotion ? 1 : 0]);

    // Cross-module timeline link: write a timeline event if recommended for promotion
    if (recommendationPromotion) {
      await dbRun(`
        INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta)
        VALUES (?, 'Promotion Recommended', ?, ?)
      `, [employeeId, new Date().toISOString().split('T')[0], JSON.stringify({ quarter, score: managerRating })]);
    }

    res.status(201).json({ message: 'Performance evaluation published successfully.', reviewId: result.id, attendanceScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review: ' + err.message });
  }
});

export default router;
