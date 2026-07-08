import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbRun, dbGet, dbAll } from '#@/core/database';
import { authenticateToken, requireRole, requirePermission, JWT_SECRET } from '#@/core/middleware/auth';
import { logSimulatedEmail } from '#@/core/email.js';
import { writeAuditLog } from '#@/core/audit.js';

const router = Router();

// Access codes for privileged roles
const ACCESS_CODES = {
  'Admin': 'ADMIN2026',
  'Super Admin': 'SUPER2026'
};

// Register user
router.post('/register', async (req, res) => {
  const { name, email, password, role, organization, accessCode, inviteCode } = req.body;

  let finalRole = role;
  let finalOrg = organization;
  let inviteRecord = null;

  try {
    // If registering with an invite code
    if (inviteCode) {
      inviteRecord = await dbGet('SELECT * FROM invites WHERE code = ? AND status = ?', [inviteCode, 'active']);
      if (!inviteRecord) {
        return res.status(400).json({ error: 'Invalid, expired, or already redeemed invite code.' });
      }
      finalRole = inviteRecord.role;
      finalOrg = inviteRecord.organization;
    } else {
      // Standard registration validation
      if (!name || !email || !password || !role || !organization) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      const validRoles = ['Employee', 'Admin', 'Super Admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
      }

      if (role === 'Admin' || role === 'Super Admin') {
        const requiredCode = ACCESS_CODES[role];
        if (accessCode !== requiredCode) {
          return res.status(403).json({ error: `Invalid access code for the role of ${role}.` });
        }
      }
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, organization) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), passwordHash, finalRole, finalOrg]
    );

    // If an invite code was redeemed, update status
    if (inviteRecord) {
      await dbRun(
        'UPDATE invites SET status = ?, redeemed_by = ? WHERE id = ?',
        ['redeemed', result.id, inviteRecord.id]
      );
    }

    // Log simulated welcome email
    await logSimulatedEmail(
      email.toLowerCase(),
      `Welcome to the Platform, ${name}!`,
      `Hi ${name},\n\nWelcome to the Enterprise WFM Platform! Your account as "${finalRole}" under "${finalOrg}" has been created successfully.`,
      'WelcomeEmployee'
    );

    await writeAuditLog(result.id, 'User Registration', `New user registered with role: ${finalRole}`);

    res.status(201).json({
      message: 'User registered successfully!',
      user: {
        id: result.id,
        name,
        email: email.toLowerCase(),
        role: finalRole,
        organization: finalOrg
      }
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal server error occurred during registration.' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 1. Check if user is already blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ 
        error: 'Your account has been blocked due to multiple failed login attempts. Please contact an administrator.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // 2. Increment failed login attempts
      const newAttempts = (user.login_attempts || 0) + 1;
      
      if (newAttempts >= 3) {
        await dbRun('UPDATE users SET login_attempts = ?, status = ? WHERE id = ?', [newAttempts, 'blocked', user.id]);
        await writeAuditLog(user.id, 'User Blocked', `Account blocked after 3 failed login attempts.`);
        return res.status(403).json({ 
          error: 'Your account has been blocked due to 3 failed login attempts. Please contact an administrator.' 
        });
      } else {
        await dbRun('UPDATE users SET login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
        return res.status(401).json({ 
          error: `Invalid email or password. Failed attempt ${newAttempts} of 3.` 
        });
      }
    }

    // 3. Reset login attempts on successful login
    await dbRun('UPDATE users SET login_attempts = 0 WHERE id = ?', [user.id]);

    const roleDetails = await dbGet('SELECT level, permissions FROM roles WHERE name = ?', [user.role]);

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
      level: roleDetails ? roleDetails.level : 10,
      permissions: roleDetails ? JSON.parse(roleDetails.permissions) : ['org:read']
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Log simulated login confirmation email
    await logSimulatedEmail(
      user.email,
      'Security Alert: New Login Detected',
      `Hi ${user.name},\n\nWe detected a new successful login to your Enterprise Workforce Management account on ${new Date().toLocaleString()}.\n\nIf this was you, no action is needed. Otherwise, please contact support immediately.`,
      'SuspiciousLogin'
    );

    await writeAuditLog(user.id, 'User Login', `User successfully authenticated.`);

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error occurred during login.' });
  }
});

// Reset password (Forgot password workflow)
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }

  try {
    const user = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Reset password, reset login attempts, and unblock user status
    await dbRun(
      'UPDATE users SET password_hash = ?, login_attempts = 0, status = ? WHERE email = ?',
      [newPasswordHash, 'active', email.toLowerCase()]
    );

    // Log simulated password reset notification
    await logSimulatedEmail(
      email.toLowerCase(),
      'Security Alert: Password Changed',
      `Hi,\n\nThis is to confirm that the password for your account (${email}) was successfully reset. If you did not request this change, please contact your administrator.`,
      'PasswordReset'
    );

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// Request password reset token (simulated email delivery)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const user = await dbGet('SELECT name FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    // Generate random 16-character token
    const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Insert token record
    await dbRun(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), token, expiresAt]
    );

    // Log simulated email containing the reset link
    const resetUrl = `http://localhost:5173/?view=reset-password&token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;
    await logSimulatedEmail(
      email.toLowerCase(),
      'Password Reset Link',
      `Hello ${user.name},\n\nYou requested a password reset for your Enterprise WFM account. Please click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.`,
      'PasswordReset'
    );

    res.status(200).json({ message: 'Reset email simulated successfully. Check the Email Simulator tab!' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to request password reset: ' + err.message });
  }
});

// Confirm and execute password reset
router.post('/reset-password-confirm', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required.' });
  }

  try {
    // Validate reset token
    const resetRecord = await dbGet(
      `SELECT * FROM password_resets 
       WHERE email = ? AND token = ? AND used = 0 AND ? < expires_at`,
      [email.toLowerCase(), token, new Date().toISOString()]
    );

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password, unlock login attempts, activate status
    await dbRun(
      'UPDATE users SET password_hash = ?, login_attempts = 0, status = ? WHERE email = ?',
      [newPasswordHash, 'active', email.toLowerCase()]
    );

    // Mark token as used
    await dbRun('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

    // Log confirmation email
    await logSimulatedEmail(
      email.toLowerCase(),
      'Security Alert: Password Changed',
      `Hi,\n\nThis is to confirm that the password for your account (${email}) was successfully reset. If you did not request this change, please contact your administrator.`,
      'PasswordReset'
    );

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password confirmation error:', err.message);
    res.status(500).json({ error: 'Failed to complete password reset: ' + err.message });
  }
});

// Get blocked users (Admin/Super Admin only)
router.get('/blocked', authenticateToken, requirePermission('user:unblock'), async (req, res) => {
  try {
    const blockedUsers = await dbAll('SELECT id, name, email, role, organization FROM users WHERE status = ?', ['blocked']);
    res.status(200).json({ blockedUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve blocked users: ' + err.message });
  }
});

// Unblock user (Admin/Super Admin only)
router.post('/unblock', authenticateToken, requirePermission('user:unblock'), async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId parameter is required.' });
  }

  try {
    const user = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    await dbRun('UPDATE users SET login_attempts = 0, status = ? WHERE id = ?', ['active', userId]);
    res.status(200).json({ message: 'User account has been unblocked successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unblock user: ' + err.message });
  }
});

// Verify current user
router.get('/me', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

export default router;
