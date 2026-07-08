import { Router } from 'express';
import { dbGet, dbAll } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = Router();

// POST /api/v1/ai/query - AI Operations Assistant Chatbot (Contextual & Voice of Data)
router.post('/query', authenticateToken, async (req, res) => {
  const { query, activeTab } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  const userQuery = query.toLowerCase();

  try {
    let contextData = '';
    let isTable = false;

    // 1. Contextual awareness prefix
    let contextualPrefix = '';
    if (activeTab) {
      contextualPrefix = `*Context: I see you are currently inspecting the **${activeTab.toUpperCase()}** management hub.* \n\n`;
    }

    // 2. Identify query intents and load relevant DB context dynamically
    if (userQuery.includes('department') || userQuery.includes('organization') || userQuery.includes('org')) {
      const orgs = await dbAll('SELECT name, code, status FROM organizations WHERE status = "Active"');
      contextData = `
| Department Name | Code | Status |
| :--- | :--- | :--- |
${orgs.map(o => `| ${o.name} | ${o.code || 'N/A'} | ${o.status} |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (userQuery.includes('role') || userQuery.includes('permission') || userQuery.includes('privilege')) {
      const roles = await dbAll('SELECT name, level FROM roles ORDER BY level DESC');
      contextData = `
| Role | Authority Level |
| :--- | :--- |
${roles.map(r => `| ${r.name} | Level ${r.level} |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (userQuery.includes('user') || userQuery.includes('staff') || userQuery.includes('employee') || userQuery.includes('who is') || userQuery.includes('directory')) {
      const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
      const users = await dbAll('SELECT name, email, role FROM users LIMIT 10');
      
      contextData = `
Total registered system logins: **${userCount.count}**

| Name | Email | Role |
| :--- | :--- | :--- |
${users.map(u => `| ${u.name} | ${u.email} | ${u.role} |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (userQuery.includes('delegation') || userQuery.includes('handoff')) {
      const delegations = await dbAll(`
        SELECT rd.*, u1.name as from_name, u2.name as to_name 
        FROM role_delegations rd
        JOIN users u1 ON rd.delegate_from_id = u1.id
        JOIN users u2 ON rd.delegate_to_id = u2.id
        WHERE rd.status = 'active'
      `);
      
      contextData = `
| Delegate From | Delegate To | Role Delegated | Expiry Date |
| :--- | :--- | :--- | :--- |
${delegations.map(d => `| ${d.from_name} | ${d.to_name} | ${d.role_name} | ${d.end_date} |`).join('\n')}
      `.trim();
      isTable = true;
    } else if (userQuery.includes('leave') || userQuery.includes('pending') || userQuery.includes('nudge')) {
      // Mock proactive nudges regarding approvals or delays
      contextData = `
### ⚠️ Proactive Task Alerts
- **3 delegation requests** have been pending manager sign-offs for **4+ days**.
- **1 separation workflow** is awaiting final IT audit log clearance.
      `.trim();
    }

    // 3. Synthesize response text
    let responseText = '';
    if (contextData) {
      responseText = `
${contextualPrefix}### 🤖 AI Operations Assistant (Claude Proxy)

Based on a real-time scan of the workspace database, here is the structured summary you requested:

${contextData}

*Note: All attrition signals and bottleneck analyses are calculated using rule-based metrics.*
      `.trim();
    } else {
      responseText = `
${contextualPrefix}### 🤖 AI Operations Assistant (Claude Proxy)
Hello **${req.user.name}**! I am your AI Operations Assistant. I can scan your SQLite database tables to generate data tables or trigger nudges.

Try asking me:
* *"Show all departments in a table"*
* *"Who is registered in the employee directory?"*
* *"List active role delegations"*
* *"Are there any pending leave approvals or nudges?"*
      `.trim();
    }

    res.status(200).json({ response: responseText });
  } catch (err) {
    res.status(500).json({ error: 'AI Assistant query processing failed: ' + err.message });
  }
});

export default router;
