import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ResetPasswordForm from './components/ResetPasswordForm';
import LandingPage from './components/LandingPage';
import DepartmentShowcase from './components/DepartmentShowcase';
import PageTransitionOverlay from './components/PageTransitionOverlay';

function App() {
  const [view, setView] = useState('landing'); // 'landing', 'personaSelect', 'login', 'register', 'dashboard', 'resetPassword'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitionState, setTransitionState] = useState('idle'); // 'idle', 'curtain-opening', 'logo-hold', 'revealing'

  const handleEnter = (target) => {
    if (target === 'personaSelect') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        setView('personaSelect');
        return;
      }
      setTransitionState('curtain-opening');
    } else {
      setView(target);
    }
  };

  useEffect(() => {
    if (transitionState === 'logo-hold') {
      const timer = setTimeout(() => {
        setTransitionState('revealing');
      }, 350);
      return () => clearTimeout(timer);
    }
    if (transitionState === 'revealing') {
      const timer = setTimeout(() => {
        setView('personaSelect');
        setTransitionState('idle');
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [transitionState]);

  // Initialize theme on app load before session validation to avoid flash of wrong theme
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored ? (stored === 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // Validate session on mount and parse password reset token links
  useEffect(() => {
    const checkSession = async () => {
      // 1. Check if the URL query parameter directs to reset-password
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const urlToken = params.get('token');
      const urlEmail = params.get('email');
      
      if (urlView === 'reset-password' && urlToken && urlEmail) {
        setView('resetPassword');
        setLoading(false);
        return;
      }

      // 2. Otherwise run standard session validation
      const token = localStorage.getItem('wfm_token');
      const savedUser = localStorage.getItem('wfm_user');

      if (!token || !savedUser) {
        setView('landing');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/v1/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setView('dashboard');
        } else {
          localStorage.removeItem('wfm_token');
          localStorage.removeItem('wfm_user');
          setView('landing');
        }
      } catch (err) {
        console.error('Session validation error:', err.message);
        setView('landing');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (token, loggedInUser) => {
    localStorage.setItem('wfm_token', token);
    localStorage.setItem('wfm_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('wfm_token');
    localStorage.removeItem('wfm_user');
    setUser(null);
    setView('landing');
  };

  const handleRegisterSuccess = () => {
    setView('login');
  };

  if (loading) {
    return (
      <div className="app-container" style={{ flexDirection: 'column', gap: '16px' }}>
        <div className="spinner-arc" style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid var(--pastel-yellow)',
          borderTopColor: 'var(--pastel-red)',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading session...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Adjust container styling based on active view (landing & personaSelect are full screen dark mode)
  const isFullScreenView = view === 'landing' || view === 'personaSelect' || view === 'dashboard' || transitionState !== 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      {/* Main viewport area */}
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {isFullScreenView ? (
          <>
            {view === 'landing' && transitionState === 'idle' && (
              <LandingPage onEnter={handleEnter} />
            )}
            {(view === 'personaSelect' || transitionState !== 'idle') && (
              <DepartmentShowcase 
                onBack={() => {
                  setTransitionState('idle');
                  setView('landing');
                }} 
                onManualLogin={() => {
                  setTransitionState('idle');
                  setView('login');
                }} 
                transitionStage={transitionState}
              />
            )}
            {view === 'dashboard' && user && (
              <Dashboard 
                user={user} 
                onLogout={handleLogout} 
              />
            )}
            {transitionState === 'curtain-opening' && (
              <PageTransitionOverlay 
                isDarkMode={document.documentElement.classList.contains('dark')} 
                onComplete={() => setTransitionState('logo-hold')} 
              />
            )}
          </>
        ) : (
          <div className="app-container">
            {view === 'login' && (
              <Login 
                onLoginSuccess={handleLoginSuccess} 
                toggleView={() => setView('register')} 
              />
            )}
            {view === 'register' && (
              <Register 
                onRegisterSuccess={handleRegisterSuccess} 
                toggleView={() => setView('login')} 
              />
            )}
            {view === 'resetPassword' && (
              <ResetPasswordForm 
                onCancel={() => setView('login')} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
