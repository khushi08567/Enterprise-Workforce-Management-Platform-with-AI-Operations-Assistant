import { Router } from 'express';
import { dbGet, dbAll, dbRun } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';

const router = Router();

// GET all user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const convs = await dbAll('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.status(200).json({ conversations: convs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET messages of a conversation
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await dbAll('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST query / conversation chat entry point
router.post('/query', authenticateToken, async (req, res) => {
  const { query, activeTab, conversationId } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  const userQuery = query.toLowerCase();

  try {
    let contextData = '';
    let isTable = false;
    let finalConvId = conversationId;
    let navigationTab = null;

    // Check for navigation commands
    const navQuery = userQuery.replace(/[^a-z0-9\s]/g, '').trim();
    const isNavCommand = navQuery.includes('open') || 
                         navQuery.includes('go to') || 
                         navQuery.includes('navigate') || 
                         navQuery.includes('show tab') ||
                         navQuery.includes('switch to') ||
                         navQuery.includes('take me to') ||
                         navQuery.includes('inspect tab') ||
                         navQuery === 'attendance clock' ||
                         navQuery === 'attendance' ||
                         navQuery === 'workforce insights' ||
                         navQuery === 'insights' ||
                         navQuery === 'employees directory' ||
                         navQuery === 'directory' ||
                         navQuery === 'organization management' ||
                         navQuery === 'organizations' ||
                         navQuery === 'audit log compliance' ||
                         navQuery === 'audit logs' ||
                         navQuery === 'recruitment board' ||
                         navQuery === 'recruitment' ||
                         navQuery === 'leave management' ||
                         navQuery === 'leave' ||
                         navQuery === 'payroll remuneration' ||
                         navQuery === 'payroll' ||
                         navQuery === 'performance targets' ||
                         navQuery === 'performance' ||
                         navQuery === 'project tasks' ||
                         navQuery === 'projects' ||
                         navQuery === 'asset inventory' ||
                         navQuery === 'assets' ||
                         navQuery === 'help desk tickets' ||
                         navQuery === 'tickets' ||
                         navQuery === 'policy documents' ||
                         navQuery === 'documents' ||
                         navQuery === 'reports and analytics' ||
                         navQuery === 'reports' ||
                         navQuery === 'role manager' ||
                         navQuery === 'roles' ||
                         navQuery === 'temporary delegations' ||
                         navQuery === 'delegations' ||
                         navQuery === 'email simulator' ||
                         navQuery === 'email logs' ||
                         navQuery === 'emails';
                         
    if (isNavCommand) {
      if (navQuery.includes('attendance') || navQuery.includes('clock') || navQuery.includes('checkin') || navQuery.includes('timecard')) {
        navigationTab = 'attendance';
      } else if (navQuery.includes('payroll') || navQuery.includes('salary') || navQuery.includes('salaries') || navQuery.includes('payslip')) {
        navigationTab = 'payroll';
      } else if (navQuery.includes('recruitment') || navQuery.includes('candidate') || navQuery.includes('interview') || navQuery.includes('offer')) {
        navigationTab = 'recruitment';
      } else if (navQuery.includes('project') || navQuery.includes('task') || navQuery.includes('kanban') || navQuery.includes('todo')) {
        navigationTab = 'projects';
      } else if (navQuery.includes('asset') || navQuery.includes('hardware') || navQuery.includes('laptop') || navQuery.includes('inventory')) {
        navigationTab = 'assets';
      } else if (navQuery.includes('audit') || navQuery.includes('compliance') || navQuery.includes('log') || navQuery.includes('event')) {
        navigationTab = 'auditLogs';
      } else if (navQuery.includes('employee') || navQuery.includes('directory') || navQuery.includes('people') || navQuery.includes('staff')) {
        navigationTab = 'employees';
      } else if (navQuery.includes('organization') || navQuery.includes('department') || navQuery.includes('dept') || navQuery.includes('tree')) {
        navigationTab = 'organizations';
      } else if (navQuery.includes('leave') || navQuery.includes('vacation') || navQuery.includes('holiday') || navQuery.includes('pto')) {
        navigationTab = 'leave';
      } else if (navQuery.includes('overview') || navQuery.includes('dashboard') || navQuery.includes('home')) {
        navigationTab = 'overview';
      } else if (navQuery.includes('insight') || navQuery.includes('analytic') || navQuery.includes('chart') || navQuery.includes('graph') || navQuery.includes('metric')) {
        navigationTab = 'insights';
      } else if (navQuery.includes('performance') || navQuery.includes('target') || navQuery.includes('goal') || navQuery.includes('review') || navQuery.includes('kpi')) {
        navigationTab = 'performance';
      } else if (navQuery.includes('ticket') || navQuery.includes('support') || navQuery.includes('helpdesk') || navQuery.includes('help desk')) {
        navigationTab = 'tickets';
      } else if (navQuery.includes('document') || navQuery.includes('policy') || navQuery.includes('policies') || navQuery.includes('handbook')) {
        navigationTab = 'documents';
      } else if (navQuery.includes('report') || navQuery.includes('analytic') || navQuery.includes('stat')) {
        navigationTab = 'reports';
      } else if (navQuery.includes('role') || navQuery.includes('permission') || navQuery.includes('access control')) {
        navigationTab = 'roles';
      } else if (navQuery.includes('delegation') || navQuery.includes('delegate')) {
        navigationTab = 'delegations';
      } else if (navQuery.includes('email') || navQuery.includes('mail') || navQuery.includes('smtp') || navQuery.includes('message')) {
        navigationTab = 'emailLogs';
      } else {
        const dbDepts = await dbAll("SELECT name FROM organizations");
        const matchesDept = dbDepts.some(d => navQuery.includes(d.name.toLowerCase()));
        if (matchesDept) {
          navigationTab = 'organizations';
        }
      }
    }

    // Persist or retrieve conversation session
    if (!finalConvId) {
      const title = query.substring(0, 30) + '...';
      const convResult = await dbRun('INSERT INTO ai_conversations (user_id, title) VALUES (?, ?)', [req.user.id, title]);
      finalConvId = convResult.id;
    }

    // Save User message
    await dbRun('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, "user", ?)', [finalConvId, query]);

    // --- CONVERSATIONAL LEAVE STATE MACHINE ---
    const messages = await dbAll('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC', [finalConvId]);

    let collected = {
      leaveType: null,
      startDate: null,
      endDate: null,
      reason: null,
      confirm: null,
      inFlow: false
    };

    const parseLeaveType = (text) => {
      const t = text.toLowerCase();
      if (t.includes('casual')) return 'Casual';
      if (t.includes('sick') || t.includes('medical') || t.includes('fever') || t.includes('doctor')) return 'Sick';
      if (t.includes('earned') || t.includes('annual') || t.includes('vacation')) return 'Earned';
      return null;
    };

    const parseDate = (text) => {
      const t = text.toLowerCase().trim();
      const today = new Date();
      
      // Basic shortcuts
      if (t === 'today') {
        return today.toISOString().split('T')[0];
      }
      if (t === 'tomorrow') {
        const tom = new Date(today);
        tom.setDate(today.getDate() + 1);
        return tom.toISOString().split('T')[0];
      }
      if (t === 'day after tomorrow') {
        const dat = new Date(today);
        dat.setDate(today.getDate() + 2);
        return dat.toISOString().split('T')[0];
      }

      // Weekday mapping
      const weekdays = {
        sunday: 0, sun: 0,
        monday: 1, mon: 1,
        tuesday: 2, tue: 2,
        wednesday: 3, wed: 3,
        thursday: 4, thu: 4,
        friday: 5, fri: 5,
        saturday: 6, sat: 6
      };

      // Check if weekday is mentioned
      let targetDay = null;
      for (const [name, val] of Object.entries(weekdays)) {
        if (new RegExp('\\b' + name + '\\b').test(t)) {
          targetDay = val;
          break;
        }
      }

      const weekMatch = t.match(/(\d+)\s*weeks?\s+from\s+(?:today|now)/);

      if (targetDay !== null) {
        let diff = targetDay - today.getDay();
        if (diff <= 0) diff += 7;
        const baseDate = new Date(today);
        baseDate.setDate(today.getDate() + diff);

        if (weekMatch) {
          const weeks = parseInt(weekMatch[1]);
          const finalDate = new Date(baseDate);
          finalDate.setDate(baseDate.getDate() + (weeks - 1) * 7);
          return finalDate.toISOString().split('T')[0];
        } else {
          if (t.includes('next') && !t.includes('this')) {
            const finalDate = new Date(baseDate);
            finalDate.setDate(baseDate.getDate() + 7);
            return finalDate.toISOString().split('T')[0];
          }
          return baseDate.toISOString().split('T')[0];
        }
      }

      if (weekMatch) {
        const weeks = parseInt(weekMatch[1]);
        const finalDate = new Date(today);
        finalDate.setDate(today.getDate() + weeks * 7);
        return finalDate.toISOString().split('T')[0];
      }

      const dayMatch = t.match(/in\s+(\d+)\s+days?/);
      if (dayMatch) {
        const days = parseInt(dayMatch[1]);
        const finalDate = new Date(today);
        finalDate.setDate(today.getDate() + days);
        return finalDate.toISOString().split('T')[0];
      }

      const match = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        return t;
      }
      return null;
    };

    const parseYesNo = (text) => {
      const t = text.toLowerCase().trim();
      if (t.includes('yes') || t.includes('yup') || t.includes('sure') || t.includes('submit') || t.includes('ok') || t === 'y') return true;
      if (t.includes('no') || t.includes('nope') || t.includes('cancel') || t === 'n') return false;
      return null;
    };

    const extractParams = (text, coll) => {
      const type = parseLeaveType(text);
      if (type) coll.leaveType = type;
      
      const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
      let match;
      const dates = [];
      while ((match = dateRegex.exec(text)) !== null) {
        dates.push(match[1]);
      }
      if (dates.length >= 1) coll.startDate = dates[0];
      if (dates.length >= 2) coll.endDate = dates[1];

      // Natural date regex extractions
      if (!coll.startDate) {
        const naturalPatterns = [
          /(?:coming|next)\s+[a-z]+\s+\d+\s+weeks?\s+from\s+(?:today|now)/i,
          /[a-z]+\s+\d+\s+weeks?\s+from\s+(?:today|now)/i,
          /\d+\s+weeks?\s+from\s+(?:today|now)/i,
          /(?:coming|next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
          /\b(today|tomorrow|day after tomorrow)\b/i,
          /in\s+\d+\s+days?/i
        ];

        for (const pattern of naturalPatterns) {
          const matchText = text.match(pattern);
          if (matchText) {
            const parsed = parseDate(matchText[0]);
            if (parsed) {
              coll.startDate = parsed;
              break;
            }
          }
        }
      }

      if (coll.startDate && !coll.endDate) {
        const toMatch = text.match(/(?:to|until|through)\s+(.+)$/i);
        if (toMatch) {
          const parsedEnd = parseDate(toMatch[1]);
          if (parsedEnd && parsedEnd >= coll.startDate) {
            coll.endDate = parsedEnd;
          }
        }
        if (!coll.endDate) {
          coll.endDate = coll.startDate;
        }
      }

      const reasonMatch = text.match(/(?:reason|because|for)\s+(.+)$/i);
      if (reasonMatch) {
        coll.reason = reasonMatch[1].trim();
      }
    };

    const triggersLeave = (text) => {
      const t = text.toLowerCase();
      return (t.includes('apply') && t.includes('leave')) ||
             (t.includes('request') && t.includes('leave')) ||
             (t.includes('take') && t.includes('leave')) ||
             (t.includes('want') && t.includes('leave')) ||
             (t.includes('need') && t.includes('leave')) ||
             t.includes('time off') ||
             t.includes('take a leave') ||
             t === 'leave';
    };

    // Scan history to reconstruct collected parameters
    const historyCount = messages.length - 1;
    for (let i = 0; i < historyCount; i++) {
      const msg = messages[i];
      if (msg.role === 'user' && triggersLeave(msg.content)) {
        collected.inFlow = true;
        extractParams(msg.content, collected);
      }
    }

    let lastPrompt = null;
    for (let i = 0; i < historyCount; i++) {
      const msg = messages[i];
      if (msg.role === 'assistant') {
        if (msg.content.includes("What type of leave would you like to apply for")) {
          lastPrompt = 'leaveType';
        } else if (msg.content.includes("Please provide the start date for your leave")) {
          lastPrompt = 'startDate';
        } else if (msg.content.includes("Please provide the end date for your leave")) {
          lastPrompt = 'endDate';
        } else if (msg.content.includes("Please tell me the reason for your leave")) {
          lastPrompt = 'reason';
        } else if (msg.content.includes("Should I submit this leave request for you")) {
          lastPrompt = 'confirm';
        }
      } else if (msg.role === 'user' && collected.inFlow) {
        if (lastPrompt === 'leaveType') {
          const type = parseLeaveType(msg.content);
          if (type) collected.leaveType = type;
        } else if (lastPrompt === 'startDate') {
          const date = parseDate(msg.content);
          if (date) collected.startDate = date;
        } else if (lastPrompt === 'endDate') {
          const date = parseDate(msg.content);
          if (date) collected.endDate = date;
        } else if (lastPrompt === 'reason') {
          collected.reason = msg.content.trim();
        } else if (lastPrompt === 'confirm') {
          const conf = parseYesNo(msg.content);
          if (conf !== null) collected.confirm = conf;
        }
        lastPrompt = null;
      }
    }

    const askNextMissing = (coll) => {
      if (!coll.leaveType) {
        return `### 🤖 Rachel\n\nSure, I can help you apply for a leave! What type of leave would you like to apply for? (Casual, Sick, or Earned)`;
      }
      if (!coll.startDate) {
        return `### 🤖 Rachel\n\nUnderstood, **${coll.leaveType} leave**. Please provide the start date for your leave (use format YYYY-MM-DD, or type 'today' / 'tomorrow').`;
      }
      if (!coll.endDate) {
        return `### 🤖 Rachel\n\nGot it, starting **${coll.startDate}**. Please provide the end date for your leave (use format YYYY-MM-DD, or type 'today' / 'tomorrow').`;
      }
      if (!coll.reason) {
        return `### 🤖 Rachel\n\nPlease tell me the reason for your leave request (e.g. personal work, medical checkup).`;
      }
      
      const diffTime = Math.abs(new Date(coll.endDate) - new Date(coll.startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return `### 🤖 Rachel\n\nI have summarized your leave request details:\n* **Leave Type**: ${coll.leaveType}\n* **Start Date**: ${coll.startDate}\n* **End Date**: ${coll.endDate}\n* **Duration**: ${diffDays} day${diffDays > 1 ? 's' : ''}\n* **Reason**: ${coll.reason}\n\nShould I submit this leave request for you? (Yes/No)`;
    };

    const submitLeaveRequest = async (userId, coll) => {
      const currentYear = new Date().getFullYear();
      try {
        const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [userId]);
        if (!emp) {
          return `### 🤖 Rachel\n\n⚠️ Error: I could not find your employee profile in the database. Please contact an administrator.`;
        }

        const defaults = [
          { type: 'Casual', days: 12 },
          { type: 'Sick', days: 10 },
          { type: 'Earned', days: 15 }
        ];
        for (const d of defaults) {
          const existing = await dbGet(
            'SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND year = ?',
            [emp.id, d.type, currentYear]
          );
          if (!existing) {
            await dbRun(
              'INSERT INTO leave_balances (employee_id, leave_type, max_days, used_days, year) VALUES (?, ?, ?, 0, ?)',
              [emp.id, d.type, d.days, currentYear]
            );
          }
        }

        const diffTime = Math.abs(new Date(coll.endDate) - new Date(coll.startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const balance = await dbGet(
          'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND year = ?',
          [emp.id, coll.leaveType, currentYear]
        );

        if (!balance) {
          return `### 🤖 Rachel\n\n⚠️ Error: No configured balances found for **${coll.leaveType}** leave.`;
        }

        const available = balance.max_days - balance.used_days;
        if (available < diffDays) {
          return `### 🤖 Rachel\n\n⚠️ **Submission Failed**: Insufficient leave balance.\n* Requested: **${diffDays} days**\n* Available: **${available} days**`;
        }

        const result = await dbRun(`
          INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
          VALUES (?, ?, ?, ?, ?, 'Pending')
        `, [emp.id, coll.leaveType, coll.startDate, coll.endDate, coll.reason]);

        return `### 🤖 Rachel\n\n🎉 **Success!** I have submitted your leave request to your manager.\n* **Request ID**: #${result.id}\n* **Duration**: ${diffDays} day${diffDays > 1 ? 's' : ''}\n* **Status**: Pending Approval\n\nYou can review this request in the **Leave Planner** tab of your dashboard.`;
      } catch (err) {
        return `### 🤖 Rachel\n\n⚠️ Error: Failed to write leave request to database: ${err.message}`;
      }
    };

    let processedInFlow = false;
    let assistantReply = '';

    if (collected.inFlow && query.toLowerCase().trim() === 'cancel') {
      assistantReply = `### 🤖 Rachel\n\nLeave request flow has been cancelled. Let me know if you need help with anything else!`;
      processedInFlow = true;
    } else if (!collected.inFlow && triggersLeave(query)) {
      collected.inFlow = true;
      extractParams(query, collected);
      assistantReply = askNextMissing(collected);
      processedInFlow = true;
    } else if (collected.inFlow) {
      const lastAssistantMsg = messages.slice(0, -1).reverse().find(m => m.role === 'assistant');
      let currentPrompt = null;
      if (lastAssistantMsg) {
        if (lastAssistantMsg.content.includes("What type of leave would you like to apply for")) {
          currentPrompt = 'leaveType';
        } else if (lastAssistantMsg.content.includes("Please provide the start date for your leave")) {
          currentPrompt = 'startDate';
        } else if (lastAssistantMsg.content.includes("Please provide the end date for your leave")) {
          currentPrompt = 'endDate';
        } else if (lastAssistantMsg.content.includes("Please tell me the reason for your leave")) {
          currentPrompt = 'reason';
        } else if (lastAssistantMsg.content.includes("Should I submit this leave request for you")) {
          currentPrompt = 'confirm';
        }
      }

      if (currentPrompt === 'leaveType') {
        const type = parseLeaveType(query);
        if (type) {
          collected.leaveType = type;
          assistantReply = askNextMissing(collected);
        } else {
          assistantReply = `### 🤖 Rachel\n\nI didn't quite catch that. Please specify one of the following leave types:\n* **Casual**\n* **Sick**\n* **Earned**`;
        }
      } else if (currentPrompt === 'startDate') {
        const date = parseDate(query);
        const todayStr = new Date().toISOString().split('T')[0];
        if (date) {
          if (date < todayStr) {
            assistantReply = `### 🤖 Rachel\n\n⚠️ The start date cannot be in the past. Please provide a valid start date (format YYYY-MM-DD, or type 'today' / 'tomorrow').`;
          } else {
            collected.startDate = date;
            assistantReply = askNextMissing(collected);
          }
        } else {
          assistantReply = `### 🤖 Rachel\n\nPlease provide a valid start date using the format **YYYY-MM-DD** (or type 'today' / 'tomorrow').`;
        }
      } else if (currentPrompt === 'endDate') {
        const date = parseDate(query);
        if (date) {
          if (date < collected.startDate) {
            assistantReply = `### 🤖 Rachel\n\n⚠️ The end date cannot be earlier than your start date (${collected.startDate}). Please provide a valid end date (format YYYY-MM-DD).`;
          } else {
            collected.endDate = date;
            assistantReply = askNextMissing(collected);
          }
        } else {
          assistantReply = `### 🤖 Rachel\n\nPlease provide a valid end date using the format **YYYY-MM-DD** (or type 'today' / 'tomorrow').`;
        }
      } else if (currentPrompt === 'reason') {
        collected.reason = query.trim();
        assistantReply = askNextMissing(collected);
      } else if (currentPrompt === 'confirm') {
        const conf = parseYesNo(query);
        if (conf === true) {
          assistantReply = await submitLeaveRequest(req.user.id, collected);
        } else if (conf === false) {
          assistantReply = `### 🤖 Rachel\n\nNo problem. I have cancelled the leave request submission. Let me know if you need to start over!`;
        } else {
          assistantReply = `### 🤖 Rachel\n\nI didn't catch your confirmation. Should I submit this leave request? Please answer **Yes** or **No**.`;
        }
      } else {
        assistantReply = askNextMissing(collected);
      }
      processedInFlow = true;
    }

    if (processedInFlow) {
      await dbRun('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, "assistant", ?)', [
        finalConvId, assistantReply
      ]);
      return res.status(200).json({ response: assistantReply, conversationId: finalConvId, navigationTab });
    }

    // 2. Intent parsing & dynamic database search tools
    const matchKeywords = (query, keywordsArray) => {
      return keywordsArray.some(keyword => query.includes(keyword));
    };

    // Synonym categories
    const docKeywords = ['policy', 'document', 'rag', 'rule', 'handbook', 'guideline', 'manual', 'file', 'pdf', 'docs', 'procedure', 'regulation', 'contract', 'agreement', 'terms'];
    const payrollKeywords = ['salary', 'payroll', 'payslip', 'pay', 'earn', 'money', 'cost', 'spend', 'financial', 'remuneration', 'compensation', 'income', 'wage', 'check', 'tax', 'deduction', 'slip', 'cash'];
    const attendanceKeywords = ['attendance', 'clock', 'timecard', 'present', 'absent', 'hours', 'log', 'checkin', 'checkout', 'late', 'worktime', 'timesheet', 'history', 'timed'];
    const leaveKeywords = ['leave', 'vacation', 'off', 'out of office', 'sick', 'break', 'absence', 'ooo', 'time off', 'time-off', 'pto', 'furlough'];
    const taskKeywords = ['project', 'task', 'kanban', 'todo', 'assignee', 'doing', 'backlog', 'board', 'work item', 'milestone', 'progress', 'develop', 'coding', 'issue', 'workload'];
    const assetKeywords = ['asset', 'laptop', 'hardware', 'device', 'computer', 'monitor', 'inventory', 'stock', 'equipment', 'item', 'macbook', 'pc', 'mouse', 'keyboard'];
    const ticketKeywords = ['ticket', 'helpdesk', 'support', 'issue', 'bug', 'error', 'broken', 'help', 'request', 'it support', 'service desk', 'complaint', 'problem'];
    const employeeKeywords = ['employ', 'user', 'member', 'staff', 'people', 'who is', 'find person', 'directory', 'contact', 'who works', 'names', 'colleague', 'team', 'worker', 'profiles'];
    const departmentKeywords = ['department', 'organization', 'division', 'dept', 'office', 'branch', 'structure', 'tree', 'corporate'];
    const shiftKeywords = ['shift', 'schedule', 'timetable', 'timing', 'hours', 'clock-in', 'rota'];
    const holidayKeywords = ['holiday', 'festive', 'calendar', 'vacation day', 'off day', 'celebration'];
    const roleKeywords = ['role', 'permission', 'matrix', 'access level', 'privilege'];
    const delegationKeywords = ['delegation', 'delegate', 'temporary access', 'handover'];
    const emailKeywords = ['email log', 'smtp', 'email simulator', 'message logs', 'emails sent'];
    const reportKeywords = ['report', 'metrics', 'stats', 'telemetry summary', 'analytic reports'];
    const auditKeywords = ['audit log', 'audit logs', 'compliance log', 'compliance events', 'system logs'];
    const insightKeywords = ['insights', 'workforce insights', 'risk profiles', 'turnover risk', 'attrition'];
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'yo', 'sup', 'morning', 'afternoon'];
    const capabilityKeywords = ['what can you do', 'help', 'features', 'capabilities', 'how to use', 'guide', 'instructions', 'help me'];

    // 2. Intent parsing & dynamic database search tools
    if (matchKeywords(userQuery, docKeywords)) {
      navigationTab = 'documents';
      // Document Search (M-12) with server-side visibility restrictions
      const emp = await dbGet('SELECT department_id FROM employees WHERE user_id = ?', [req.user.id]);
      const userDept = emp ? emp.department_id : null;
      const userRole = req.user.role;

      const docs = await dbAll(`
        SELECT title, category, version, file_url, visibility 
        FROM documents 
        WHERE visibility = 'org-wide'
           OR (visibility = 'department-specific' AND CAST(target_id AS INTEGER) = ?)
           OR (visibility = 'role-restricted' AND target_id = ?)
      `, [userDept, userRole]);

      contextData = `
### 📁 Document RAG Search
Here are the policy files you are permitted to view:

| Title | Category | Version | Visibility | Link |
| :--- | :--- | :--- | :--- | :--- |
${docs.map(d => `| ${d.title} | ${d.category} | ${d.version} | ${d.visibility} | [Open PDF](${d.file_url}) |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (matchKeywords(userQuery, payrollKeywords)) {
      navigationTab = 'payroll';
      // Payroll Explainer (M-07) - RBAC checked
      let payrollData = [];
      if (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'HR') {
        payrollData = await dbAll(`
          SELECT p.*, u.name as employee_name 
          FROM payrolls p
          JOIN employees e ON p.employee_id = e.id
          JOIN users u ON e.user_id = u.id
          LIMIT 10
        `);
      } else {
        const empRecord = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (empRecord) {
          payrollData = await dbAll('SELECT * FROM payrolls WHERE employee_id = ?', [empRecord.id]);
        }
      }

      contextData = `
### 💵 Payroll Cost Summary
| Employee / ID | Month | Gross Pay | Tax deductions | Net Pay | Payslip |
| :--- | :--- | :--- | :--- | :--- | :--- |
${payrollData.map(p => `| ${p.employee_name || 'Personal'} | ${p.month} | $${p.basic_salary} | $${p.income_tax} | $${p.net_salary} | [Download PDF](#) |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (matchKeywords(userQuery, attendanceKeywords)) {
      navigationTab = 'attendance';
      // Attendance (M-05) summary
      const attendance = await dbAll(`
        SELECT a.date, a.status, u.name as employee_name 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        JOIN users u ON e.user_id = u.id
        ORDER BY a.date DESC LIMIT 10
      `);

      contextData = `
### ⏱️ Attendance Audit Log
| Date | Employee | Status |
| :--- | :--- | :--- |
${attendance.map(a => `| ${a.date} | ${a.employee_name} | ${a.status} |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (matchKeywords(userQuery, leaveKeywords)) {
      navigationTab = 'leave';
      // Leave Assistant (M-06)
      const leaves = await dbAll(`
        SELECT lr.*, u.name as employee_name 
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        JOIN users u ON e.user_id = u.id
        ORDER BY lr.created_at DESC LIMIT 10
      `);

      contextData = `
### 📅 Leave Requests Pipeline
| Employee | Leave Type | Duration | Status |
| :--- | :--- | :--- | :--- |
${leaves.map(l => `| ${l.employee_name} | ${l.leave_type} | ${l.start_date} to ${l.end_date} | ${l.status} |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (matchKeywords(userQuery, taskKeywords)) {
      navigationTab = 'projects';
      
      // Fetch actual projects
      const projectsList = await dbAll(`
        SELECT p.name, p.status, p.start_date, p.end_date, u.name as owner_name 
        FROM projects p
        LEFT JOIN employees e ON p.owner_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 10
      `);

      // Fetch tasks
      const tasksList = await dbAll(`
        SELECT t.title, t.status, t.priority, u.name as assignee_name 
        FROM tasks t
        LEFT JOIN employees e ON t.assignee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `);

      let projectsTable = "";
      if (projectsList.length > 0) {
        projectsTable = `### 📁 Active Projects
| Project Name | Status | Owner | Timeline |
| :--- | :--- | :--- | :--- |
${projectsList.map(p => `| ${p.name} | ${p.status} | ${p.owner_name || 'Unassigned'} | ${p.start_date || ''} to ${p.end_date || ''} |`).join('\n')}
\n\n`;
      }

      contextData = `${projectsTable}### 📋 Recent Tasks & Assignments
| Task Title | Assignee | Status | Priority |
| :--- | :--- | :--- | :--- |
${tasksList.map(t => `| ${t.title} | ${t.assignee_name || 'Unassigned'} | ${t.status} | ${t.priority} |`).join('\n')}`.trim();
      isTable = true;
    } 
    else if (matchKeywords(userQuery, assetKeywords)) {
      navigationTab = 'assets';
      // Assets (M-10)
      const assets = await dbAll(`
        SELECT a.name, a.asset_tag, a.status, u.name as assignee_name 
        FROM assets a
        LEFT JOIN employees e ON a.assigned_to = e.id
        LEFT JOIN users u ON e.user_id = u.id
        LIMIT 10
      `);

      contextData = `
### 💻 Hardware Assets Inventory
| Device | Asset Tag | Status | Assignee |
| :--- | :--- | :--- | :--- |
${assets.map(a => `| ${a.name} | ${a.asset_tag} | ${a.status} | ${a.assignee_name || 'In Stock'} |`).join('\n')}
      `.trim();
      isTable = true;
    } 
    else if (matchKeywords(userQuery, ticketKeywords)) {
      navigationTab = 'tickets';
      // Help Desk (M-11)
      const tickets = await dbAll(`
        SELECT t.subject, t.category, t.priority, t.status, u.name as raised_by_name 
        FROM tickets t
        JOIN users u ON t.raised_by = u.id
        LIMIT 10
      `);

      contextData = `
### 🎫 Help Desk IT Queue
| Subject | Category | Priority | Reporter | Status |
| :--- | :--- | :--- | :--- | :--- |
${tickets.map(t => `| ${t.subject} | ${t.category} | ${t.priority} | ${t.raised_by_name} | ${t.status} |`).join('\n')}
      `.trim();
      isTable = true;
    }
    else if (matchKeywords(userQuery, employeeKeywords)) {
      navigationTab = 'employees';
      
      const isNewQuery = userQuery.includes('new') || userQuery.includes('recent') || userQuery.includes('added');
      
      // Check if a specific department name is mentioned in the query
      const dbDepts = await dbAll("SELECT id, name FROM organizations");
      let matchedDept = null;
      for (const d of dbDepts) {
        if (userQuery.includes(d.name.toLowerCase())) {
          matchedDept = d;
          break;
        }
      }

      let assistantReply = "";
      if (isNewQuery) {
        // Fetch recently added employees
        const recentEmps = await dbAll(`
          SELECT e.employee_id, u.name, u.email, o.name as department_name, e.joining_date 
          FROM employees e
          JOIN users u ON e.user_id = u.id
          LEFT JOIN organizations o ON e.department_id = o.id
          ORDER BY e.created_at DESC
          LIMIT 5
        `);

        if (recentEmps.length > 0) {
          assistantReply = `### 🤖 Rachel\n\nHere are the most recently added employees in the system:\n\n| ID | Name | Email | Department | Joining Date |\n| :--- | :--- | :--- | :--- | :--- |\n${recentEmps.map(emp => `| ${emp.employee_id} | ${emp.name} | ${emp.email} | ${emp.department_name || 'N/A'} | ${emp.joining_date} |`).join('\n')}`;
          
          // Save Assistant reply
          await dbRun('INSERT INTO ai_messages (conversation_id, role, content, structured_data) VALUES (?, "assistant", ?, ?)', [
            finalConvId, assistantReply, null
          ]);

          return res.status(200).json({ 
            response: assistantReply, 
            conversationId: finalConvId, 
            navigationTab
          });
        }
      }

      if (matchedDept) {
        assistantReply = `### 🤖 Rachel\n\nI am opening the **Employee Directory** and filtering for the **${matchedDept.name}** department for you right now!`;
      } else {
        assistantReply = `### 🤖 Rachel\n\nI am opening the **Employee Directory** for you right now!`;
      }
      
      // Save Assistant reply
      await dbRun('INSERT INTO ai_messages (conversation_id, role, content, structured_data) VALUES (?, "assistant", ?, ?)', [
        finalConvId, assistantReply, null
      ]);

      return res.status(200).json({ 
        response: assistantReply, 
        conversationId: finalConvId, 
        navigationTab,
        filterDepartment: matchedDept ? matchedDept.name : null
      });
    }
    else if (matchKeywords(userQuery, departmentKeywords)) {
      navigationTab = 'organizations';
      const depts = await dbAll(`
        SELECT name, code, status 
        FROM organizations 
        LIMIT 20
      `);
      contextData = `
### 🏢 Corporate Departments Registry
There are **${depts.length}** total departments/nodes configured in the system:

| Department Name | Code / Identifier | Status |
| :--- | :--- | :--- |
${depts.map(d => `| ${d.name} | ${d.code || 'N/A'} | ${d.status} |`).join('\n')}
      `.trim();
      isTable = true;
    }
    else if (matchKeywords(userQuery, shiftKeywords)) {
      navigationTab = 'attendance';
      const shifts = await dbAll(`
        SELECT name, start_time, end_time, status 
        FROM work_shifts 
        LIMIT 10
      `);
      contextData = `
### ⏰ Corporate Work Shifts
Here is the work shift schedule configuration:

| Shift Name | Start Time | End Time | Status |
| :--- | :--- | :--- | :--- |
${shifts.map(s => `| ${s.name} | ${s.start_time} | ${s.end_time} | ${s.status} |`).join('\n')}
      `.trim();
      isTable = true;
    }
    else if (matchKeywords(userQuery, holidayKeywords)) {
      navigationTab = 'leave';
      const holidays = await dbAll(`
        SELECT name, date, description 
        FROM holidays 
        ORDER BY date ASC 
        LIMIT 10
      `);
      contextData = `
### 🏖️ Corporate Holiday Calendar
Here are the official public and company holidays:

| Holiday | Date | Description |
| :--- | :--- | :--- |
${holidays.map(h => `| ${h.name} | ${h.date} | ${h.description || 'Company Holiday'} |`).join('\n')}
      `.trim();
      isTable = true;
    }
    else if (matchKeywords(userQuery, roleKeywords)) {
      const rolesList = await dbAll('SELECT name, level, permissions FROM roles');
      contextData = `
### 🛡️ System Roles & Permissions Matrix
| Role Name | Access Level | Configured Permissions |
| :--- | :--- | :--- |
${rolesList.map(r => `| ${r.name} | Lvl ${r.level} | ${JSON.parse(r.permissions).join(', ') || 'None'} |`).join('\n')}
      `.trim();
      isTable = true;
      navigationTab = 'roles';
    }
    else if (matchKeywords(userQuery, delegationKeywords)) {
      const delegations = await dbAll(`
        SELECT rd.id, u1.name as delegator, u2.name as delegatee, rd.role_name, rd.start_date, rd.end_date, rd.status 
        FROM role_delegations rd 
        JOIN users u1 ON rd.delegate_from_id = u1.id 
        JOIN users u2 ON rd.delegate_to_id = u2.id 
        LIMIT 10
      `);
      contextData = `
### 📋 Temporary Role Delegations
| Delegator | Delegatee | Assigned Role | Period | Status |
| :--- | :--- | :--- | :--- | :--- |
${delegations.map(d => `| ${d.delegator} | ${d.delegatee} | ${d.role_name} | ${d.start_date} to ${d.end_date} | ${d.status} |`).join('\n')}
      `.trim();
      isTable = true;
      navigationTab = 'delegations';
    }
    else if (matchKeywords(userQuery, emailKeywords)) {
      const emails = await dbAll('SELECT to_email, subject, status, created_at FROM email_logs ORDER BY created_at DESC LIMIT 10');
      contextData = `
### ✉️ System Simulated Email Logs
| Recipient | Subject | Status | Timestamp |
| :--- | :--- | :--- | :--- |
${emails.map(e => `| ${e.to_email} | ${e.subject} | ${e.status} | ${e.created_at} |`).join('\n')}
      `.trim();
      isTable = true;
      navigationTab = 'emailLogs';
    }
    else if (matchKeywords(userQuery, reportKeywords)) {
      const empCount = await dbGet("SELECT COUNT(*) as count FROM employees");
      const pendingLeaves = await dbGet("SELECT COUNT(*) as count FROM leave_requests WHERE status = 'Pending'");
      const openTickets = await dbGet("SELECT COUNT(*) as count FROM tickets WHERE status != 'Closed'");
      const totalAssets = await dbGet("SELECT COUNT(*) as count FROM assets");
      
      contextData = `
### 📊 System Telemetry & Workforce Reports
Here are the current core metrics compiled from database registers:

| Operational Metric | Current Count | Category |
| :--- | :--- | :--- |
| Registered Staff Directory | ${empCount?.count || 0} employees | Human Capital |
| Awaiting Leave Approvals | ${pendingLeaves?.count || 0} requests | Leave Pipeline |
| Open IT Support Tickets | ${openTickets?.count || 0} tickets | IT Help Desk |
| Tracked Devices Custody | ${totalAssets?.count || 0} assets | Hardware Assets |
      `.trim();
      isTable = true;
      navigationTab = 'reports';
    }
    else if (matchKeywords(userQuery, auditKeywords)) {
      const logs = await dbAll(`
        SELECT al.id, u.name as actor, al.action, al.category, al.details, al.created_at 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC 
        LIMIT 10
      `);
      contextData = `
### 🛡️ System Audit Logs & Compliance Registry
| ID | User / Actor | Action | Module / Category | Timestamp |
| :--- | :--- | :--- | :--- | :--- |
${logs.map(l => `| #${l.id} | ${l.actor || 'System'} | ${l.action} | ${l.category} | ${l.created_at} |`).join('\n')}
      `.trim();
      isTable = true;
      navigationTab = 'auditLogs';
    }
    else if (matchKeywords(userQuery, insightKeywords)) {
      const risks = await dbAll(`
        SELECT u.name as employee_name, erp.risk_score, erp.risk_factors 
        FROM employee_risk_profiles erp 
        JOIN employees e ON erp.employee_id = e.id 
        JOIN users u ON e.user_id = u.id 
        LIMIT 10
      `);
      contextData = `
### 📈 Workforce Attrition Risk Profiles
Here is the automated AI risk classification assessment:

| Employee | Risk Score | Principal Risk Factors |
| :--- | :--- | :--- |
${risks.map(r => `| ${r.employee_name} | ${r.risk_score}/100 | ${r.risk_factors || 'Stable'} |`).join('\n')}
      `.trim();
      isTable = true;
      navigationTab = 'insights';
    }

    // 3. Synthesize final assistant response
    assistantReply = '';
    if (navigationTab) {
      const tabNames = {
        attendance: '⏱️ Attendance Tracking',
        payroll: '💵 Payroll Explainer',
        recruitment: '🤝 Recruitment Pipeline',
        projects: '📋 Project Kanban Board',
        assets: '💻 Hardware Asset Registry',
        auditLogs: '🛡️ System Audit Logs',
        employees: '👤 Employee Directory',
        organizations: '🏢 Enterprise Department Tree',
        leave: '📅 Leave Planner',
        overview: '📊 Command Center Overview',
        insights: '📈 Workforce Insights',
        performance: '🎯 Performance Targets',
        tickets: '🎫 IT Help Desk',
        documents: '📁 Policy Documents',
        reports: '📊 Reports & Analytics',
        roles: '🛡️ Role Manager',
        delegations: '📋 Temporary Delegations',
        emailLogs: '✉️ Email Simulator'
      };
      
      assistantReply = `
### 🤖 Rachel

I am opening the **${tabNames[navigationTab]}** section for you right now!

${contextData ? `Here is the data summary for this section:\n\n${contextData}` : ''}
      `.trim();
    } else if (contextData) {
      assistantReply = `
### 🤖 Rachel

Based on a real-time scan of the database, here is the requested data table:

${contextData}
      `.trim();
    } else if (matchKeywords(userQuery, greetings) || userQuery.includes('morning') || userQuery.includes('afternoon') || userQuery.includes('evening') || userQuery.includes('night')) {
      let greetingText = '';
      if (userQuery.includes('morning')) {
        greetingText = `Good morning, **${req.user.name}**! ☀️ How can I assist you with Syncra Enterprise operations this morning? You can ask me to search policy manuals, check shift timetables, or audit log check-ins!`;
      } else if (userQuery.includes('afternoon')) {
        greetingText = `Good afternoon, **${req.user.name}**! 🌤️ Hope your day is going well. What SQLite database records or documents can I fetch for you this afternoon?`;
      } else if (userQuery.includes('evening')) {
        greetingText = `Good evening, **${req.user.name}**! 🌇 As the day winds down, let me know if you need to review any project tasks, leave schedules, or active IT tickets tonight.`;
      } else if (userQuery.includes('night')) {
        greetingText = `Good night, **${req.user.name}**! 🌙 Hope you had a productive day. Let me know if there's any final detail you need to check before logging off.`;
      } else {
        const greetingOptions = [
          `Hello **${req.user.name}**! 😊 How can I help you manage Syncra Enterprise today? You can ask me about payroll logs, employee directory details, shift schedules, hardware assets, or company policy documents.`,
          `Hi **${req.user.name}**! 👋 Rachel active. What information from our SQLite database can I retrieve for you?`,
          `Greetings, **${req.user.name}**! 🤖 I'm connected to the workspace system. Ask me anything about tasks, team leaves, or IT support tickets!`
        ];
        greetingText = greetingOptions[Math.floor(Math.random() * greetingOptions.length)];
      }
      assistantReply = `### 🤖 Rachel\n\n` + greetingText;
    } else if (matchKeywords(userQuery, capabilityKeywords)) {
      assistantReply = `
### 🤖 Rachel

I am your intelligent assistant. I can query our SQLite database dynamically to help you inspect:
1. 📁 **Policy Documents (RAG)**: Search and view employee guidelines.
2. 💵 **Payroll Explainer**: View salaries, deductions, and payslip data (RBAC enforced).
3. ⏱️ **Attendance Logs**: Track employee check-in history.
4. 📅 **Leave Requests**: Check who is out of office.
5. 📋 **Project Tasks**: Monitor Kanban progress.
6. 💻 **Hardware Inventory**: Check devices and laptop allocations.
7. 🎫 **IT Help Desk**: Review support ticket queues.
8. 👤 **Employee Directory**: Search colleagues by name (e.g., query *"Who is Priya?"*).
      `.trim();
    } else {
      assistantReply = `
### 🤖 Rachel

I analyzed your query: *"**${query}**"*. 

While I couldn't map that directly to a specific database command, I can assist you with:
* 👤 **Finding colleagues** (e.g., *"Search for Rahul"* or *"Who is Priya?"*)
* 💵 **Payroll details** (e.g., *"Show basic salary logs"* or *"payroll costs"*)
* 📅 **Leave tracker** (e.g., *"Is anyone on vacation?"*)
* ⏱️ **Work time logs** (e.g., *"Attendance check-ins"* or *"clock status"*)
* 📁 **Company rules** (e.g., *"Search HR policy manual"*)

Let me know what you would like to look up!
      `.trim();
    }

    // Save Assistant reply
    await dbRun('INSERT INTO ai_messages (conversation_id, role, content, structured_data) VALUES (?, "assistant", ?, ?)', [
      finalConvId, assistantReply, isTable ? JSON.stringify({ isTable: true }) : null
    ]);

    res.status(200).json({ response: assistantReply, conversationId: finalConvId, navigationTab });
  } catch (err) {
    res.status(500).json({ error: 'AI Operations Chatbot failed: ' + err.message });
  }
});

export default router;
