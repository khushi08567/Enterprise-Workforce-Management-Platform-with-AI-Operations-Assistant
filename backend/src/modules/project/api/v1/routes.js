import express from 'express';
import { dbAll, dbGet, dbRun } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = express.Router();

// 1. Project Management
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await dbAll(`
      SELECT p.*, u.name as owner_name 
      FROM projects p
      JOIN employees e ON p.owner_id = e.id
      JOIN users u ON e.user_id = u.id
    `);
    res.status(200).json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, description, ownerId, startDate, endDate, members } = req.body;
  if (!name || !ownerId) {
    return res.status(400).json({ error: 'Project name and owner ID are required.' });
  }
  try {
    const result = await dbRun(
      `INSERT INTO projects (name, description, owner_id, status, start_date, end_date, members)
       VALUES (?, ?, ?, 'Planning', ?, ?, ?)`,
      [name, description, ownerId, startDate, endDate, JSON.stringify(members || [])]
    );
    res.status(201).json({ message: 'Project established.', projectId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.status(200).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Task Management
router.get('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await dbAll(`
      SELECT t.*, u.name as assignee_name 
      FROM tasks t
      LEFT JOIN employees e ON t.assignee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE t.project_id = ?
    `, [req.params.id]);
    res.status(200).json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/tasks', authenticateToken, async (req, res) => {
  const { title, description, assigneeId, priority, deadline } = req.body;
  if (!title || !deadline) {
    return res.status(400).json({ error: 'Task title and deadline are required.' });
  }
  try {
    const result = await dbRun(
      `INSERT INTO tasks (project_id, title, description, assignee_id, priority, status, deadline)
       VALUES (?, ?, ?, ?, ?, 'To Do', ?)`,
      [req.params.id, title, description, assigneeId, priority || 'Medium', deadline]
    );
    res.status(201).json({ message: 'Task created.', taskId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Task (with server-side strict constraints)
router.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { status, title, description, assigneeId, priority, deadline } = req.body;
  try {
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    // Constraint 1: Completed tasks are read-only and cannot be updated.
    if (task.status === 'Completed') {
      return res.status(400).json({ error: 'Completed tasks are read-only and cannot be modified.' });
    }

    // Constraint 2: Task cannot move to Completed without a Review step.
    if (status === 'Completed' && task.status !== 'Review') {
      return res.status(400).json({ error: 'A task must be in the Review stage before it can be marked as Completed.' });
    }

    await dbRun(
      `UPDATE tasks 
       SET status = ?, title = ?, description = ?, assignee_id = ?, priority = ?, deadline = ?
       WHERE id = ?`,
      [
        status || task.status,
        title || task.title,
        description || task.description,
        assigneeId !== undefined ? assigneeId : task.assignee_id,
        priority || task.priority,
        deadline || task.deadline,
        req.params.id
      ]
    );
    res.status(200).json({ message: 'Task updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Comments, Attachments & Time Tracking
router.get('/tasks/:id/comments', authenticateToken, async (req, res) => {
  try {
    const comments = await dbAll(`
      SELECT tc.*, u.name as user_name 
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [req.params.id]);
    res.status(200).json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/comments', authenticateToken, async (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'Comment content is required.' });
  try {
    await dbRun(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, comment]
    );
    res.status(201).json({ message: 'Comment posted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/:id/time-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await dbAll(`
      SELECT tl.*, u.name as user_name 
      FROM task_time_logs tl
      JOIN users u ON tl.user_id = u.id
      WHERE tl.task_id = ?
    `, [req.params.id]);
    res.status(200).json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/time-logs', authenticateToken, async (req, res) => {
  const { hoursLogged, date } = req.body;
  if (!hoursLogged || !date) {
    return res.status(400).json({ error: 'Hours logged and date are required.' });
  }
  try {
    await dbRun(
      'INSERT INTO task_time_logs (task_id, user_id, hours_logged, date) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, parseFloat(hoursLogged), date]
    );
    res.status(201).json({ message: 'Time logged successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
