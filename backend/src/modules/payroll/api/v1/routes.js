import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken } from '#@/core/middleware/auth';
import { writeAuditLog } from '#@/core/audit.js';
import { generatePayslipPdf } from '#@/core/pdf.js';

const router = Router();

// POST /api/v1/payroll/run - Batch generate payroll for a given month and year
router.post('/run', authenticateToken, async (req, res) => {
  const { month, year } = req.body;

  if (req.user.role !== 'Finance' && req.user.role !== 'HR' && req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Access denied. Payroll execution is restricted to Finance/HR administrators.' });
  }

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  try {
    const employees = await dbAll('SELECT * FROM employees WHERE status = "Active"');
    let count = 0;

    for (const emp of employees) {
      // Check if payroll already exists for this month/year
      const existing = await dbGet(
        'SELECT id FROM payrolls WHERE employee_id = ? AND month = ? AND year = ?',
        [emp.id, month, year]
      );
      if (existing) continue;

      const baseSalary = emp.salary || 40000.0;
      
      // Calculate earnings & deductions components
      const basic = Math.round(baseSalary * 0.5 * 100) / 100;
      const hra = Math.round(baseSalary * 0.3 * 100) / 100;

      // Pull overtime from attendance
      const attendanceLogs = await dbAll(
        'SELECT working_hours FROM attendance WHERE employee_id = ? AND strftime("%m", date) = ? AND strftime("%Y", date) = ?',
        [emp.id, String(month).padStart(2, '0'), String(year)]
      );
      let totalOvertimeHours = 0;
      attendanceLogs.forEach(a => {
        if (a.working_hours > 8) {
          totalOvertimeHours += (a.working_hours - 8);
        }
      });
      const overtimePay = Math.round(totalOvertimeHours * 25.0 * 100) / 100; // $25/hr rate

      const pf = Math.round(baseSalary * 0.05 * 100) / 100;
      const profTax = 150.00;
      const incTax = Math.round(baseSalary * 0.1 * 100) / 100;
      const net = Math.round((basic + hra + overtimePay - pf - profTax - incTax) * 100) / 100;

      await dbRun(`
        INSERT INTO payrolls (employee_id, month, year, basic_salary, hra, overtime_pay, pf, professional_tax, income_tax, net_salary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [emp.id, month, year, basic, hra, overtimePay, pf, profTax, incTax, net]);

      count++;
    }

    await writeAuditLog(req.user.id, 'Payroll Executed', `Executed payroll batch for ${month}/${year}. Disbursed ${count} slips.`);
    res.status(201).json({ message: 'Payroll generation complete.', generatedCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run payroll batch: ' + err.message });
  }
});

// GET /api/v1/payroll - Get payroll list for active employee (payslips history)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const emp = await dbGet('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (!emp) {
      return res.status(200).json({ payrolls: [] });
    }

    const logs = await dbAll('SELECT * FROM payrolls WHERE employee_id = ? ORDER BY year DESC, month DESC', [emp.id]);
    res.status(200).json({ payrolls: logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payslips: ' + err.message });
  }
});

// GET /api/v1/payroll/all - Get all payrolls (Admin/Finance only)
router.get('/all', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Finance' && req.user.role !== 'HR' && req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Access denied. Administrative payroll lookup restricted.' });
  }

  try {
    const list = await dbAll(`
      SELECT p.*, e.employee_id, u.name as employee_name
      FROM payrolls p
      JOIN employees e ON p.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      ORDER BY p.year DESC, p.month DESC
    `);
    res.status(200).json({ payrolls: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payroll history: ' + err.message });
  }
});

// POST /api/v1/payroll/:id/approve - Finalize payroll run status
router.post('/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'Finance' && req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Access denied. Only Finance Managers can approve payroll releases.' });
  }

  try {
    await dbRun('UPDATE payrolls SET status = "Approved" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Payslip approved and finalized.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve payroll: ' + err.message });
  }
});

// GET /api/v1/payroll/:id/payslip - Download Payslip PDF
router.get('/:id/payslip', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const payroll = await dbGet('SELECT * FROM payrolls WHERE id = ?', [id]);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll entry not found.' });
    }

    const employee = await dbGet(`
      SELECT e.*, u.name, u.email 
      FROM employees e 
      JOIN users u ON e.user_id = u.id 
      WHERE e.id = ?
    `, [payroll.employee_id]);

    // Safety check: Employees can only view their own payslips
    if (req.user.role !== 'Finance' && req.user.role !== 'HR' && req.user.role !== 'Admin' && req.user.role !== 'Super Admin' && req.user.id !== employee.user_id) {
      return res.status(403).json({ error: 'Access denied. You can only download your own salary payslips.' });
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[payroll.month - 1] || 'Month';

    const pdfBuffer = await generatePayslipPdf(employee, payroll, monthName, payroll.year);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Payslip_${monthName}_${payroll.year}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Payslip document: ' + err.message });
  }
});

export default router;
