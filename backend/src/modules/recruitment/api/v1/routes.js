import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';
import { writeAuditLog } from '#@/core/audit.js';
import { generateOfferLetterPdf } from '#@/core/pdf.js';

const router = Router();

// GET /api/v1/recruitment/candidates - List candidates
router.get('/candidates', authenticateToken, async (req, res) => {
  try {
    const candidates = await dbAll(`
      SELECT c.*, d.title as designation_title 
      FROM candidates c
      LEFT JOIN designations d ON c.applied_for_designation_id = d.id
      ORDER BY c.created_at DESC
    `);
    res.status(200).json({ candidates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve candidates: ' + err.message });
  }
});

// POST /api/v1/recruitment/candidates - Add Candidate
router.post('/candidates', authenticateToken, async (req, res) => {
  const { name, email, phone, resumeUrl, skills, experienceYears, appliedForDesignationId, source } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Candidate name and email are required.' });
  }

  try {
    const existing = await dbGet('SELECT id FROM candidates WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'A candidate with this email is already registered.' });
    }

    const skillsStr = Array.isArray(skills) ? JSON.stringify(skills) : JSON.stringify([]);
    
    const result = await dbRun(`
      INSERT INTO candidates (name, email, phone, resume_url, skills, experience_years, applied_for_designation_id, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email.toLowerCase(), phone, resumeUrl, skillsStr, experienceYears || 0, appliedForDesignationId, source || 'direct']);

    await writeAuditLog(req.user.id, 'Candidate Created', `Candidate ${name} (${email}) registered.`);
    res.status(201).json({ message: 'Candidate registered successfully.', candidateId: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create candidate: ' + err.message });
  }
});

// PUT /api/v1/recruitment/candidates/:id/status - Update Status (Kanban drag-drop)
router.put('/candidates/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Applied', 'Screening', 'Technical Interview', 'HR Interview', 'Offer', 'Joined', 'Rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid candidate status.' });
  }

  try {
    const candidate = await dbGet('SELECT * FROM candidates WHERE id = ?', [id]);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Business Rules:
    // 1. Resume check before moving past Applied
    if (status !== 'Applied' && !candidate.resume_url) {
      return res.status(400).json({ error: 'Resume URL is mandatory before moving the candidate past the Applied stage.' });
    }

    // 2. Can't jump directly to Interview without screening step complete
    if ((status === 'Technical Interview' || status === 'HR Interview') && candidate.status === 'Applied') {
      return res.status(400).json({ error: 'Interviews cannot be scheduled without completing the Screening stage first.' });
    }

    await dbRun('UPDATE candidates SET status = ? WHERE id = ?', [status, id]);
    await writeAuditLog(req.user.id, 'Candidate Status Updated', `Candidate ID ${id} moved to status ${status}.`);
    
    res.status(200).json({ message: 'Candidate status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update candidate status: ' + err.message });
  }
});

// POST /api/v1/recruitment/candidates/:id/analyze - AI Resume analyzer
router.post('/candidates/:id/analyze', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const candidate = await dbGet('SELECT * FROM candidates WHERE id = ?', [id]);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Check cache
    if (candidate.ai_score !== null) {
      return res.status(200).json({
        message: 'Analysis fetched from cache.',
        analysis: {
          score: candidate.ai_score,
          matchedSkills: JSON.parse(candidate.ai_matched_skills || '[]'),
          missingSkills: JSON.parse(candidate.ai_missing_skills || '[]')
        }
      });
    }

    // Claude Proxy Mock (using matching logic with designations)
    const designation = await dbGet('SELECT title FROM designations WHERE id = ?', [candidate.applied_for_designation_id]);
    const dTitle = designation ? designation.title.toLowerCase() : 'software developer';
    
    const candidateSkills = JSON.parse(candidate.skills || '[]');
    let requiredSkills = ['javascript', 'node.js', 'react', 'sql'];
    if (dTitle.includes('designer')) requiredSkills = ['figma', 'ui/ux', 'css', 'wireframes'];
    if (dTitle.includes('manager')) requiredSkills = ['leadership', 'agile', 'scrum', 'budgeting'];

    const matchedSkills = candidateSkills.filter(s => requiredSkills.includes(s.toLowerCase()));
    const missingSkills = requiredSkills.filter(s => !candidateSkills.map(cs => cs.toLowerCase()).includes(s));

    const baseScore = 40 + (candidate.experience_years * 5);
    const matchedMultiplier = (matchedSkills.length / Math.max(requiredSkills.length, 1)) * 40;
    const finalScore = Math.min(Math.round(baseScore + matchedMultiplier), 100);

    await dbRun(`
      UPDATE candidates 
      SET ai_score = ?, ai_matched_skills = ?, ai_missing_skills = ?
      WHERE id = ?
    `, [finalScore, JSON.stringify(matchedSkills), JSON.stringify(missingSkills), id]);

    res.status(200).json({
      message: 'AI Resume Analysis completed successfully.',
      analysis: {
        score: finalScore,
        matchedSkills,
        missingSkills
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Resume analyzer failed: ' + err.message });
  }
});

// POST /api/v1/recruitment/interviews - Schedule interview
router.post('/interviews', authenticateToken, async (req, res) => {
  const { candidateId, interviewerId, type, scheduledAt } = req.body;

  if (!candidateId || !interviewerId || !type || !scheduledAt) {
    return res.status(400).json({ error: 'candidateId, interviewerId, type, and scheduledAt are required.' });
  }

  try {
    const candidate = await dbGet('SELECT status FROM candidates WHERE id = ?', [candidateId]);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Interview pre-requisite check
    if (candidate.status === 'Applied') {
      return res.status(400).json({ error: 'Candidate must complete the Screening step before scheduling interviews.' });
    }

    const result = await dbRun(`
      INSERT INTO interviews (candidate_id, interviewer_id, type, scheduled_at)
      VALUES (?, ?, ?, ?)
    `, [candidateId, interviewerId, type, scheduledAt]);

    res.status(201).json({ message: 'Interview scheduled successfully.', interviewId: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule interview: ' + err.message });
  }
});

// GET /api/v1/recruitment/interviews - Get all interviews
router.get('/interviews', authenticateToken, async (req, res) => {
  try {
    const interviews = await dbAll(`
      SELECT i.*, c.name as candidate_name, c.email as candidate_email, u.name as interviewer_name
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      JOIN users u ON i.interviewer_id = u.id
    `);
    res.status(200).json({ interviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interviews: ' + err.message });
  }
});

// PUT /api/v1/recruitment/interviews/:id/feedback - Add Interview Feedback (Lock to interviewer)
router.put('/interviews/:id/feedback', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { feedback, rating } = req.body;

  try {
    const interview = await dbGet('SELECT * FROM interviews WHERE id = ?', [id]);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    // Lock feedback to the assigned interviewer
    if (req.user.id !== interview.interviewer_id) {
      return res.status(403).json({ error: 'Access denied. Feedback entry is locked to the assigned interviewer only.' });
    }

    await dbRun('UPDATE interviews SET feedback = ?, rating = ? WHERE id = ?', [feedback, rating, id]);
    res.status(200).json({ message: 'Interview feedback logged successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log feedback: ' + err.message });
  }
});

// POST /api/v1/recruitment/offers - Create Offer
router.post('/offers', authenticateToken, async (req, res) => {
  const { candidateId, proposedSalary, proposedJoiningDate } = req.body;

  if (!candidateId || !proposedSalary || !proposedJoiningDate) {
    return res.status(400).json({ error: 'candidateId, proposedSalary, and proposedJoiningDate are required.' });
  }

  try {
    const result = await dbRun(`
      INSERT INTO offers (candidate_id, proposed_salary, proposed_joining_date)
      VALUES (?, ?, ?)
    `, [candidateId, proposedSalary, proposedJoiningDate]);

    res.status(201).json({ message: 'Offer drafted successfully.', offerId: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create offer: ' + err.message });
  }
});

// POST /api/v1/recruitment/offers/:id/approve - Approve Offer (HR only)
router.post('/offers/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'HR' && req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Only HR Managers or Administrators can approve employment offers.' });
  }

  try {
    await dbRun('UPDATE offers SET approved_by_hr = 1, status = "Sent" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Offer approved and transitioned to Sent status.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve offer: ' + err.message });
  }
});

// PUT /api/v1/recruitment/offers/:id/status - Update offer status (Accepted/Declined)
router.put('/offers/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Accepted', 'Declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid offer status.' });
  }

  try {
    const offer = await dbGet('SELECT * FROM offers WHERE id = ?', [id]);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found.' });
    }

    if (offer.approved_by_hr === 0) {
      return res.status(400).json({ error: 'Cannot transition offer status without prior HR approval stamp.' });
    }

    await dbRun('UPDATE offers SET status = ? WHERE id = ?', [id]);

    // Also update candidate status
    if (status === 'Accepted') {
      await dbRun('UPDATE candidates SET status = "Offer" WHERE id = ?', [offer.candidate_id]);
    }

    res.status(200).json({ message: 'Offer status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update offer status: ' + err.message });
  }
});

// GET /api/v1/recruitment/offers/:id/pdf - Download offer letter PDF
router.get('/offers/:id/pdf', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const offer = await dbGet('SELECT * FROM offers WHERE id = ?', [id]);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found.' });
    }

    const candidate = await dbGet('SELECT * FROM candidates WHERE id = ?', [offer.candidate_id]);
    const designation = await dbGet('SELECT title FROM designations WHERE id = ?', [candidate.applied_for_designation_id]);

    const pdfBuffer = await generateOfferLetterPdf(
      candidate,
      designation ? designation.title : 'Software Developer',
      offer.proposed_salary,
      offer.proposed_joining_date
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OfferLetter_${candidate.name.replace(/\s+/g, '_')}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
  }
});

// GET /api/v1/recruitment/dashboard - Funnel analytics metrics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const counts = await dbAll('SELECT status, COUNT(*) as count FROM candidates GROUP BY status');
    
    // Default funnel numbers structure
    const funnel = {
      'Applied': 0,
      'Screening': 0,
      'Technical Interview': 0,
      'HR Interview': 0,
      'Offer': 0,
      'Joined': 0,
      'Rejected': 0
    };

    counts.forEach(c => {
      if (funnel[c.status] !== undefined) {
        funnel[c.status] = c.count;
      }
    });

    res.status(200).json({ funnel });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics: ' + err.message });
  }
});

// GET /api/v1/recruitment/offers - List all offers
router.get('/offers', authenticateToken, async (req, res) => {
  try {
    const offers = await dbAll(`
      SELECT o.*, c.name as candidate_name, c.email as candidate_email, d.title as designation_title, c.id as candidate_id, c.applied_for_designation_id
      FROM offers o
      JOIN candidates c ON o.candidate_id = c.id
      LEFT JOIN designations d ON c.applied_for_designation_id = d.id
    `);
    res.status(200).json({ offers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve offers: ' + err.message });
  }
});

export default router;
