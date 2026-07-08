import React, { useState } from 'react';

const Login = ({ onLoginSuccess, toggleView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Social login states
  const [oauthModal, setOauthModal] = useState(null); // null, 'google', 'linkedin'
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      setMessage({ type: 'success', text: data.message });
      
      setTimeout(() => {
        onLoginSuccess(data.token, data.user);
      }, 800);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setMessage({ type: 'error', text: 'Email address is required.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Password reset request failed.');

      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (profileEmail, name, role, organization) => {
    setLoading(true);
    setMessage(null);
    setOauthModal(null);
    const mockPassword = 'OAuthPassword123';
    
    try {
      // Step 1: Pre-register social user in database (handles duplicate errors gracefully on backend)
      await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email: profileEmail, 
          password: mockPassword, 
          role, 
          organization, 
          accessCode: role === 'Super Admin' ? 'SUPER2026' : role === 'Admin' ? 'ADMIN2026' : undefined 
        })
      });

      // Step 2: Login the verified user
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profileEmail, password: mockPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Social login authorization failed.');
      }

      setMessage({ type: 'success', text: `Signed in successfully via OAuth: Welcome, ${name}` });
      setTimeout(() => {
        onLoginSuccess(data.token, data.user);
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ position: 'relative' }}>
      <div className="auth-header">
        <h1 className="auth-logo">
          Enterprise<span>WFM</span>
        </h1>
        <p className="auth-subtitle">AI-Powered Workforce Operations Assistant</p>
      </div>

      {message && (
        <div className={`toast-msg toast-${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '⚠'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Forgot Password Mode Form */}
      {forgotMode ? (
        <form onSubmit={handleForgotPassword} noValidate>
          <div style={{ marginBottom: '24px', fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Enter your account email below. We will simulate sending a password reset link to your email address.
          </div>
          <div className="form-group">
            <input
              type="email"
              id="resetEmail"
              className="form-control"
              placeholder=" "
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled={loading}
              required
            />
            <label htmlFor="resetEmail" className="form-label">Account Email Address</label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span 
              className="auth-toggle-link" 
              onClick={() => { setForgotMode(false); setMessage(null); }}
              style={{ fontSize: '13.5px' }}
            >
              ← Back to Login
            </span>
          </div>
        </form>
      ) : (
        /* Standard Login Mode Form */
        <>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <label htmlFor="email" className="form-label">Email Address</label>
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <label htmlFor="password" className="form-label">Password</label>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <span 
                className="auth-toggle-link" 
                onClick={() => { setForgotMode(true); setMessage(null); }}
                style={{ fontSize: '13px', fontWeight: 500 }}
              >
                Forgot password?
              </span>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Social Logins Section */}
          <div style={{ margin: '24px 0 16px 0', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '16px 0' }}>
              <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid rgba(74,46,42,0.08)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Or login through</span>
              <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid rgba(74,46,42,0.08)' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.06)' }}
                onClick={() => setOauthModal('google')}
              >
                <img src="https://images.coolfields.co.uk/g-logo.png" alt="G" style={{ width: '14px', height: '14px' }} onError={(e) => { e.target.style.display='none'; }} />
                Google
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.06)' }}
                onClick={() => setOauthModal('linkedin')}
              >
                <span style={{ color: '#0077B5', fontWeight: 'bold', fontSize: '14px' }}>in</span>
                LinkedIn
              </button>
            </div>
          </div>
        </>
      )}

      <div className="auth-toggle" style={{ marginTop: '24px' }}>
        Don't have an account?{' '}
        <span className="auth-toggle-link" onClick={toggleView}>
          Create new account
        </span>
      </div>

      {/* Simulated OAuth Selection Modal */}
      {oauthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(74, 46, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="auth-card" style={{ maxWidth: '400px', width: '90%', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                Sign in with {oauthModal === 'google' ? 'Google' : 'LinkedIn'}
              </h2>
              <button 
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setOauthModal(null)}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Select a mock social profile to authenticate securely.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {oauthModal === 'google' ? (
                <>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthLogin('admin.google@wfm.com', 'Alex Google Admin', 'Super Admin', 'Main Corp')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Alex Google Admin</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>admin.google@wfm.com (Super Admin)</span>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthLogin('developer.google@wfm.com', 'Dev Google Staff', 'Employee', 'Engineering')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Dev Google Staff</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>developer.google@wfm.com (Employee)</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthLogin('manager.linkedin@wfm.com', 'Jordan LinkedIn Mgr', 'Admin', 'Marketing')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Jordan LinkedIn Mgr</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>manager.linkedin@wfm.com (Admin)</span>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthLogin('staff.linkedin@wfm.com', 'Taylor LinkedIn User', 'Employee', 'Marketing')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Taylor LinkedIn User</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>staff.linkedin@wfm.com (Employee)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
