import React, { useState, useEffect } from 'react';

const ResetPasswordForm = ({ onCancel }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Extract token and email parameters from current window URL query string
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    setEmail(params.get('email') || '');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/reset-password-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, token, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to complete password reset.');

      setMessage({ type: 'success', text: data.message + ' Redirecting to login...' });
      setTimeout(() => {
        // Clear query parameters from URL for clean redirect
        window.history.replaceState({}, document.title, window.location.pathname);
        onCancel();
      }, 2500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card fade-in">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '8px' }}>
          🔒 New Password Selection
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Set a secure password for account: <strong>{email}</strong>
        </p>
      </div>

      {message && (
        <div className={`toast-msg toast-${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '⚠'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <input
            type="password"
            id="newPass"
            className="form-control"
            placeholder=" "
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
          />
          <label htmlFor="newPass" className="form-label">New Password</label>
        </div>

        <div className="form-group">
          <input
            type="password"
            id="confirmPass"
            className="form-control"
            placeholder=" "
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
          <label htmlFor="confirmPass" className="form-label">Confirm New Password</label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Executing password update...' : 'Confirm Reset Password'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <span 
            className="auth-toggle-link" 
            onClick={onCancel}
            style={{ fontSize: '13.5px' }}
          >
            Cancel and Return
          </span>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
