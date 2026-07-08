import nodemailer from 'nodemailer';
import { dbRun } from '#@/core/database';
import dotenv from 'dotenv';

dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

// Initialize Transporter
let transporter = null;

if (SMTP_USER && SMTP_PASS) {
  const host = SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(SMTP_PORT || '465');
  const secure = port === 465; // true for 465, false for 587 (TLS)

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
  console.log(`[SMTP Transporter] Initialized for ${SMTP_USER} via ${host}:${port}`);
} else {
  console.warn('[Email Warning] SMTP credentials (SMTP_USER and SMTP_PASS) are not configured in .env. Real emails will be skipped, but logs will be recorded.');
}

export const logSimulatedEmail = async (toEmail, subject, body, template) => {
  try {
    // 1. Always record in the database log (so the simulator still displays the history!)
    await dbRun(
      'INSERT INTO email_logs (to_email, subject, body, template, status) VALUES (?, ?, ?, ?, ?)',
      [toEmail, subject, body, template, 'sent']
    );

    // 2. If transporter is configured, send the real email!
    if (transporter) {
      const mailOptions = {
        from: SMTP_USER,
        to: toEmail,
        subject,
        text: body
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`[SMTP Error] Failed to send email to ${toEmail}:`, error.message);
        } else {
          console.log(`[SMTP Success] Email sent successfully to ${toEmail}: ${info.messageId}`);
        }
      });
    } else {
      console.log(`[Simulated Email Logged] Sent template "${template}" to ${toEmail} (Real email skipped due to missing SMTP config in .env)`);
    }
  } catch (err) {
    console.error('Failed to log/send simulated email:', err);
  }
};
