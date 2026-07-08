import React, { useState } from 'react';

const Register = ({ onRegisterSuccess, toggleView }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [organization, setOrganization] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValidated, setInviteValidated] = useState(false);
  const [oauthModal, setOauthModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleOAuthSignup = async (profileEmail, name, role, organization) => {
    setLoading(true);
    setMessage(null);
    setOauthModal(null);
    const mockPassword = 'OAuthPassword123';
    
    try {
      // Step 1: Pre-register social user in database
      const regResponse = await fetch('http://localhost:5000/api/v1/auth/register', {
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

      if (!regResponse.ok) {
        const regData = await regResponse.json();
        // If already registered, it's fine, we proceed to redirect to login or login directly
        if (regResponse.status !== 409) {
          throw new Error(regData.error || 'Social signup registration failed.');
        }
      }

      setMessage({ type: 'success', text: `OAuth registration successful! Welcome, ${name}` });
      setTimeout(() => {
        onRegisterSuccess();
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateInvite = async () => {
    if (!inviteCode) {
      setMessage({ type: 'error', text: 'Please enter an invite code first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:5000/api/v1/invites/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate invite code.');
      }
      setRole(data.role);
      setOrganization(data.organization);
      setInviteValidated(true);
      setMessage({ type: 'success', text: `Code valid! Assigned to ${data.organization} as ${data.role}.` });
    } catch (err) {
      setInviteValidated(false);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClearInvite = () => {
    setInviteCode('');
    setInviteValidated(false);
    setRole('Employee');
    setOrganization('');
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Basic input validation
    if (!name || !email || !password || (!inviteValidated && (!role || !organization))) {
      setMessage({ type: 'error', text: 'All required fields must be filled.' });
      setLoading(false);
      return;
    }

    if (!inviteValidated && (role === 'Admin' || role === 'Super Admin') && !accessCode) {
      setMessage({ type: 'error', text: 'Access code is required for Admin/Super Admin registration.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: inviteValidated ? undefined : role,
          organization: inviteValidated ? undefined : organization,
          inviteCode: inviteValidated ? inviteCode.trim() : undefined,
          accessCode: (!inviteValidated && (role === 'Admin' || role === 'Super Admin')) ? accessCode : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setMessage({ type: 'success', text: 'Registration successful! Redirecting to login...' });
      
      // Auto toggle to Login view after 1.5 seconds
      setTimeout(() => {
        onRegisterSuccess();
      }, 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1 className="auth-logo">
          Enterprise<span>WFM</span>
        </h1>
        <p className="auth-subtitle">Create your Workforce Operations Account</p>
      </div>

      {message && (
        <div className={`toast-msg toast-${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '⚠'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Invite Code Verification Block */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
            <input
              type="text"
              id="inviteCode"
              className="form-control"
              placeholder=" "
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={loading || inviteValidated}
            />
            <label htmlFor="inviteCode" className="form-label">Invite Code (Optional)</label>
          </div>
          {!inviteValidated ? (
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: '100px', padding: 0 }}
              onClick={handleValidateInvite}
              disabled={loading || !inviteCode}
            >
              Validate
            </button>
          ) : (
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: '100px', padding: 0, background: 'rgba(220, 80, 80, 0.1)', color: 'var(--pastel-red)' }}
              onClick={handleClearInvite}
              disabled={loading}
            >
              Clear
            </button>
          )}
        </div>
        <div className="form-group">
          <input
            type="text"
            id="name"
            className="form-control"
            placeholder=" "
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
          <label htmlFor="name" className="form-label">Full Name</label>
        </div>

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

        <div className="form-group">
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

        <div className="form-group">
          <input
            type="text"
            id="organization"
            className="form-control"
            placeholder=" "
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            disabled={loading || inviteValidated}
            required
          />
          <label htmlFor="organization" className="form-label">Organization / Company</label>
        </div>

        <div className="form-group form-select-container">
          <select
            id="role"
            className="form-control form-select"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setAccessCode(''); // Reset access code
            }}
            disabled={loading || inviteValidated}
            required
          >
            {inviteValidated ? (
              <option value="Employee">Employee (Staff)</option>
            ) : (
              <option value="" disabled>Select administrative role...</option>
            )}
            <option value="Admin">Admin (Manager/HR)</option>
            <option value="Super Admin">Super Admin (System Owner)</option>
          </select>
          <label htmlFor="role" className="form-label">Select Workspace Role</label>
        </div>

        {/* Dynamic Access Code field */}
        {!inviteValidated && (role === 'Admin' || role === 'Super Admin') && (
          <>
            <div className="access-code-banner">
              <span>🛈</span>
              <span>
                Demo access code required: 
                <strong> {role === 'Admin' ? 'ADMIN2026' : 'SUPER2026'}</strong>
              </span>
            </div>
            <div className="form-group">
              <input
                type="text"
                id="accessCode"
                className="form-control"
                placeholder=" "
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                disabled={loading}
                required
              />
              <label htmlFor="accessCode" className="form-label">Security Access Code</label>
            </div>
          </>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Social Register Section */}
      <div style={{ margin: '20px 0 16px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '14px 0' }}>
          <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid rgba(74,46,42,0.08)' }} />
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>Or sign up with</span>
          <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid rgba(74,46,42,0.08)' }} />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.06)' }}
            onClick={() => setOauthModal('google')}
            disabled={loading}
          >
            <img src="https://images.coolfields.co.uk/g-logo.png" alt="G" style={{ width: '14px', height: '14px' }} onError={(e) => { e.target.style.display='none'; }} />
            Google
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.06)' }}
            onClick={() => setOauthModal('linkedin')}
            disabled={loading}
          >
            <span style={{ color: '#0077B5', fontWeight: 'bold', fontSize: '14px' }}>in</span>
            LinkedIn
          </button>
        </div>
      </div>

      <div className="auth-toggle">
        Already have an account?{' '}
        <span className="auth-toggle-link" onClick={toggleView}>
          Sign in
        </span>
      </div>

      {/* Simulated OAuth Registration Modal */}
      {oauthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(74, 46, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="auth-card" style={{ maxWidth: '400px', width: '90%', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                Register via {oauthModal === 'google' ? 'Google' : 'LinkedIn'}
              </h2>
              <button 
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setOauthModal(null)}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Select a mock profile key to pre-register and join the platform.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {oauthModal === 'google' ? (
                <>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthSignup('social.admin@gmail.com', 'Alex Social Admin', 'Super Admin', 'Main Corp')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Alex Social Admin</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>social.admin@gmail.com (Super Admin)</span>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthSignup('social.dev@gmail.com', 'Dev Social Staff', 'Employee', 'Engineering')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Dev Social Staff</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>social.dev@gmail.com (Employee)</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthSignup('social.mgr@linkedin.com', 'Jordan Social Mgr', 'Admin', 'Marketing')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Jordan Social Mgr</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>social.mgr@linkedin.com (Admin)</span>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 16px', height: 'auto', background: '#ffffff' }}
                    onClick={() => handleOAuthSignup('social.emp@linkedin.com', 'Taylor Social User', 'Employee', 'Marketing')}
                  >
                    <strong style={{ fontSize: '13.5px' }}>Taylor Social User</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>social.emp@linkedin.com (Employee)</span>
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

export default Register;
