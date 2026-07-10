import express from 'express';
import { dbAll, dbGet, dbRun } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = express.Router();

// Get documents list with server-side visibility filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Retrieve user profile to find their department
    const emp = await dbGet('SELECT department_id FROM employees WHERE user_id = ?', [req.user.id]);
    const userDept = emp ? emp.department_id : null;
    const userRole = req.user.role;

    // Server-side Visibility Enforced query
    let documents;
    if (userRole === 'Super Admin' || userRole === 'Organization Admin') {
      documents = await dbAll(`
        SELECT d.*, u.name as uploaded_by_name 
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
      `);
    } else {
      documents = await dbAll(`
        SELECT d.*, u.name as uploaded_by_name 
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.visibility = 'org-wide'
           OR (d.visibility = 'department-specific' AND CAST(d.target_id AS INTEGER) = ?)
           OR (d.visibility = 'role-restricted' AND d.target_id = ?)
      `, [userDept, userRole]);
    }

    res.status(200).json({ documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { title, category, fileUrl, visibility, targetId } = req.body;
  if (!title || !category || !fileUrl) {
    return res.status(400).json({ error: 'Title, category, and file URL are required.' });
  }

  try {
    const result = await dbRun(
      `INSERT INTO documents (title, category, file_url, uploaded_by, version, visibility, target_id)
       VALUES (?, ?, ?, ?, '1.0', ?, ?)`,
      [title, category, fileUrl, req.user.id, visibility || 'org-wide', targetId || null]
    );

    // Seed initial version
    await dbRun(
      'INSERT INTO document_versions (document_id, version, file_url, uploaded_by) VALUES (?, "1.0", ?, ?)',
      [result.id, fileUrl, req.user.id]
    );

    res.status(201).json({ message: 'Document published.', documentId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET document versions history
router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const versions = await dbAll(`
      SELECT dv.*, u.name as uploaded_by_name 
      FROM document_versions dv
      JOIN users u ON dv.uploaded_by = u.id
      WHERE dv.document_id = ?
      ORDER BY dv.created_at DESC
    `, [req.params.id]);
    res.status(200).json({ versions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new version update (Version History)
router.post('/:id/version', authenticateToken, async (req, res) => {
  const { fileUrl, version } = req.body;
  if (!fileUrl || !version) {
    return res.status(400).json({ error: 'File URL and new version string are required.' });
  }

  try {
    const doc = await dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Insert new version record
    await dbRun(
      'INSERT INTO document_versions (document_id, version, file_url, uploaded_by) VALUES (?, ?, ?, ?)',
      [req.params.id, version, fileUrl, req.user.id]
    );

    // Update main document path to the latest version URL
    await dbRun(
      'UPDATE documents SET file_url = ?, version = ? WHERE id = ?',
      [fileUrl, version, req.params.id]
    );

    res.status(200).json({ message: 'Document version updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
