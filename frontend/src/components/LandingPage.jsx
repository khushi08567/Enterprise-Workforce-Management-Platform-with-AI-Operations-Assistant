import React from 'react';

const LandingPage = ({ onEnter }) => {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#030712',
      backgroundImage: 'radial-gradient(circle at 50% 120%, #1e1b4b, #030712)',
      color: '#f9fafb',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Blur Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '40vw',
        height: '40vw',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.08)',
        filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '35vw',
        height: '35vw',
        borderRadius: '50%',
        background: 'rgba(168, 85, 247, 0.05)',
        filter: 'blur(120px)',
        pointerEvents: 'none'
      }} />

      {/* Header bar */}
      <header style={{
        width: '100%',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#3b82f6',
            backgroundImage: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
          }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>⚙</span>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: '#ffffff'
          }}>
            WORKFORCE OS
          </span>
        </div>
        <button 
          onClick={() => onEnter('personaSelect')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f3f4f6',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '13.5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          Sign In
        </button>
      </header>

      {/* Main hero section */}
      <main style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 20px',
        zIndex: 10,
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Shield badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '12px',
          fontWeight: '500',
          color: '#818cf8',
          marginBottom: '32px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          🛡️ DECENTRALIZED OPERATIONS KERNEL
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '60px',
          fontWeight: '800',
          lineHeight: '1.1',
          letterSpacing: '-1.5px',
          color: '#ffffff',
          marginBottom: '24px'
        }}>
          The Future of <br />
          <span style={{
            backgroundImage: 'linear-gradient(90deg, #818cf8, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Workforce Intelligence
          </span>
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '18px',
          color: '#9ca3af',
          lineHeight: '1.6',
          maxWidth: '650px',
          marginBottom: '40px'
        }}>
          A high-fidelity corporate operating system. Seamless onboarding, automated access control, auditing, and AI operations consolidated in one unified core.
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => onEnter('personaSelect')}
            style={{
              padding: '14px 28px',
              borderRadius: '8px',
              backgroundColor: '#6366f1',
              backgroundImage: 'linear-gradient(135deg, #6366f1, #a855f7)',
              border: 'none',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14.5px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(99, 102, 241, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
            }}
          >
            Initialize Access Sequence →
          </button>
          <button
            onClick={() => onEnter('personaSelect')}
            style={{
              padding: '14px 28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#9ca3af',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14.5px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            Analyze Kernel Architecture
          </button>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
