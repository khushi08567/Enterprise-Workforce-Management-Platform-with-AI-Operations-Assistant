import React, { useState } from 'react';

const PersonaSelector = ({ onSelect, onBack, onManualLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const personas = [
    {
      title: 'SUPER ADMIN',
      role: 'Super Admin',
      email: 'khushipathak.2026@gmail.com',
      desc: 'System-wide owner. Deploy environments, rotate security keys, and manage tenant organizations.',
      badge: 'RESPONSIBILITIES: TENANT LIFECYCLE, GLOBAL SECRETS ROTATION',
      perms: 'PERMISSIONS: FULL READ/WRITE ON CORE NODE',
      color: '#ef4444'
    },
    {
      title: 'ORGANIZATION ADMIN',
      role: 'Admin',
      email: 'khushipathak.080@gmail.com',
      desc: 'Company workspace lead. Provision departments, assign administrators, and configure compliance parameters.',
      badge: 'RESPONSIBILITIES: DEPARTMENTS MAPPING, SYSTEM CONFIGURATIONS',
      perms: 'PERMISSIONS: WRITE ON ORGANIZATION SCOPE',
      color: '#3b82f6'
    },
    {
      title: 'HR MANAGER',
      role: 'Admin',
      email: 'khushipathak.080@gmail.com',
      desc: 'Staff directory supervisor. Onboard new hires, manage candidate tracking, and publish job vacancies.',
      badge: 'RESPONSIBILITIES: DIRECTORY MANAGEMENT, JOBS POSTING',
      perms: 'PERMISSIONS: MODIFY EMPLOYEES AND JOBS REGISTRY',
      color: '#ec4899'
    },
    {
      title: 'DEPARTMENT MANAGER',
      role: 'Admin',
      email: 'khushipathak.080@gmail.com',
      desc: 'Operational unit director. Review attendance charts, coordinate leaves, and supervise team schedules.',
      badge: 'RESPONSIBILITIES: LEAVES REVIEW, SHIFT LOGS VALIDATION',
      perms: 'PERMISSIONS: APPROVALS ON UNIT SCOPE',
      color: '#eab308'
    },
    {
      title: 'TEAM LEAD',
      role: 'Employee',
      email: 'r18aven@gmail.com',
      desc: 'Project coordinator. Define task backlogs, allocate sprint resources, and review developer progress.',
      badge: 'RESPONSIBILITIES: PROJECT TASKS ASSIGNMENT, LOGS CHECK',
      perms: 'PERMISSIONS: WRITE ON PROJECTS SCOPE',
      color: '#10b981'
    },
    {
      title: 'EMPLOYEE',
      role: 'Employee',
      email: 'r18aven@gmail.com',
      desc: 'Staff operator. Record clock-in coordinates, request personal leaves, and file IT helpdesk support tickets.',
      badge: 'RESPONSIBILITIES: DAILY CLOCK-IN, LEAVES SUBMISSIONS',
      perms: 'PERMISSIONS: READ/WRITE ON PERSONAL SCOPE',
      color: '#6366f1'
    },
    {
      title: 'FINANCE EXECUTIVE',
      role: 'Employee',
      email: 'r18aven@gmail.com',
      desc: 'Treasury coordinator. Review automated payroll databases, configure salaries, and review tax allocations.',
      badge: 'RESPONSIBILITIES: PAYROLL CALCULATION, SALARY VALIDATION',
      perms: 'PERMISSIONS: REGULATORY AUDITS COMPLIANCE TRACKING',
      color: '#a855f7'
    },
    {
      title: 'IT ADMINISTRATOR',
      role: 'Admin',
      email: 'khushipathak.080@gmail.com',
      desc: 'Security infrastructure lead. Monitor server health channels, reset passwords, and audit secure connections.',
      badge: 'RESPONSIBILITIES: VITALS TRACKING, PASSWORD RESETS',
      perms: 'PERMISSIONS: INFRASTRUCTURE DIAGNOSTIC HOOKS',
      color: '#14b8a6'
    },
    {
      title: 'AUDITOR',
      role: 'Employee',
      email: 'r18aven@gmail.com',
      desc: 'Compliance monitor. Inspect dynamic system audit logs for administrative actions, tracking security and role policies.',
      badge: 'RESPONSIBILITIES: REGULATORY AUDITS COMPLIANCE TRACKING',
      perms: 'PERMISSIONS: READ ON CORE AUDIT TRAIL',
      color: '#64748b'
    }
  ];

  const handlePersonaClick = async (persona) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // We use a default fallback password that is seeded in the test framework.
        body: JSON.stringify({
          email: persona.email,
          password: 'password123'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate as ' + persona.role);
      }

      onSelect(data.token, data.user);
    } catch (err) {
      setError(err.message + ' (Please make sure user is registered or check server console)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: '#f9fafb',
      padding: '40px',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Top navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          ← Back to Hub
        </button>
        <span style={{
          fontSize: '11px',
          letterSpacing: '1px',
          color: '#6b7280',
          fontFamily: 'monospace'
        }}>
          NODE: SHOWCASE_PROVISIONER
        </span>
      </div>

      {/* Header title */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '36px',
          fontWeight: '800',
          letterSpacing: '1.5px',
          color: '#ffffff',
          marginBottom: '12px'
        }}>
          CHOOSE YOUR PERSONA
        </h2>
        <p style={{
          fontSize: '15px',
          color: '#9ca3af',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.5'
        }}>
          Select an administrative role to explore TechNova Global. Access levels, analytics, and sidebar options will adapt instantly.
        </p>
      </div>

      {error && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 24px auto',
          padding: '12px 20px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#f87171',
          fontSize: '13.5px',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          color: '#818cf8',
          fontSize: '14px'
        }}>
          <div className="spinner-arc" style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid rgba(129, 140, 248, 0.2)',
            borderTopColor: '#818cf8',
            animation: 'spin 0.8s linear infinite'
          }} />
          Authenticating selected role session...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Grid structure */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        flexGrow: 1
      }}>
        {personas.map((p, idx) => (
          <div
            key={idx}
            onClick={() => !loading && handlePersonaClick(p)}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '24px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (loading) return;
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = p.color;
              e.currentTarget.style.boxShadow = `0 10px 30px -10px ${p.color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Color accent highlight */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: p.color
            }} />

            <div>
              {/* Icon & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ color: p.color, fontSize: '18px' }}>👤</span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#ffffff',
                  letterSpacing: '0.5px'
                }}>
                  {p.title}
                </h3>
              </div>

              {/* Description */}
              <p style={{
                fontSize: '13px',
                color: '#9ca3af',
                lineHeight: '1.5',
                marginBottom: '20px'
              }}>
                {p.desc}
              </p>
            </div>

            {/* Badges footer */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
              <div style={{ marginBottom: '6px' }}>{p.badge}</div>
              <div>{p.perms}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Manual sign in option */}
      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <span 
          onClick={onManualLogin}
          style={{
            color: '#818cf8',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}
        >
          Or sign in manually with email & password
        </span>
      </div>
    </div>
  );
};

export default PersonaSelector;
