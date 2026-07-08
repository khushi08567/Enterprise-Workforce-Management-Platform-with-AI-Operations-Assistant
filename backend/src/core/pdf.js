import PDFDocument from 'pdfkit';

export function generateOfferLetterPdf(candidate, designationTitle, salary, joiningDate) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('ENTERPRISE WFM SYSTEMS', { align: 'center' }).moveDown(0.2);
      doc.fontSize(12).font('Helvetica').text('Corporate HQ • Compliance Operations Office', { align: 'center' }).moveDown();
      doc.text('----------------------------------------------------------------------------------------------------', { align: 'center' }).moveDown();

      doc.fontSize(16).font('Helvetica-Bold').text('EMPLOYMENT OFFER LETTER', { align: 'center' }).moveDown();
      doc.fontSize(10).font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' }).moveDown();

      // Recipient
      doc.fontSize(11).font('Helvetica-Bold').text('Candidate Details:');
      doc.fontSize(11).font('Helvetica').text(`Name: ${candidate.name}`);
      doc.text(`Email: ${candidate.email}`);
      doc.text(`Phone: ${candidate.phone || 'N/A'}`).moveDown();

      // Body
      doc.text(`Dear ${candidate.name},`, { font: 'Helvetica-Bold' }).moveDown();
      doc.text(`On behalf of Enterprise WFM Systems, we are pleased to offer you employment for the position of ${designationTitle}.`);
      doc.text(`Your proposed annual base compensation will be $${salary.toLocaleString()} starting on your joining date of ${joiningDate}.`);
      doc.moveDown();
      doc.text('This offer is subject to strict HR approvals and verification of academic and professional credentials. To confirm your acceptance, please sign and return this offer within 3 business days.');
      doc.moveDown(3);

      // Signatures
      doc.fontSize(11).font('Helvetica-Bold').text('__________________________________', { align: 'left' });
      doc.text('Corporate Human Resources Director', { align: 'left' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generatePayslipPdf(employee, payroll, monthName, year) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('ENTERPRISE WFM SYSTEMS', { align: 'center' }).moveDown(0.2);
      doc.fontSize(12).font('Helvetica').text('Monthly Remuneration Statement', { align: 'center' }).moveDown();
      doc.text('----------------------------------------------------------------------------------------------------', { align: 'center' }).moveDown();

      doc.fontSize(16).font('Helvetica-Bold').text(`PAYSLIP FOR ${monthName.toUpperCase()} ${year}`, { align: 'center' }).moveDown();

      // Details
      doc.fontSize(11).font('Helvetica-Bold').text('Employee Information:');
      doc.fontSize(11).font('Helvetica').text(`Employee Name: ${employee.name}`);
      doc.text(`Email: ${employee.email}`);
      doc.text(`Employee ID: ${employee.employee_id}`).moveDown();

      // Earnings & Deductions Tables
      doc.fontSize(12).font('Helvetica-Bold').text('Salary Components Breakdown:');
      doc.fontSize(11).font('Helvetica').text('----------------------------------------------------------------------------------');
      doc.text(`Basic Salary: $${payroll.basic_salary.toLocaleString()}`);
      doc.text(`House Rent Allowance (HRA): $${payroll.hra.toLocaleString()}`);
      doc.text(`Overtime Allowance: $${payroll.overtime_pay.toLocaleString()}`);
      doc.text(`Discretionary Bonus: $${payroll.bonus.toLocaleString()}`);
      doc.text('----------------------------------------------------------------------------------');
      doc.text(`Provident Fund Deduction (PF): -$${payroll.pf.toLocaleString()}`);
      doc.text(`Professional Tax: -$${payroll.professional_tax.toLocaleString()}`);
      doc.text(`Income Tax Withholding: -$${payroll.income_tax.toLocaleString()}`);
      doc.text(`Other Adjustments/Deductions: -$${payroll.other_deductions.toLocaleString()}`);
      doc.text('----------------------------------------------------------------------------------');
      doc.fontSize(13).font('Helvetica-Bold').text(`NET PAYABLE SALARY: $${payroll.net_salary.toLocaleString()}`, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
