import React, { useState, useEffect, useRef } from 'react';
import { Code2, Megaphone, DollarSign, Users, Briefcase, X, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../assets/logo.png';

const API_BASE = 'http://localhost:5000/api/v1';

const DepartmentShowcase = ({ onBack, onManualLogin, transitionStage }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [selectedDept, setSelectedDept] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // Sync state with prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // We can track the internal stage for logo-hold/reveal
  const [showcaseStage, setShowcaseStage] = useState(() => {
    if (prefersReducedMotion) return 'idle';
    return (transitionStage === 'curtain-opening' || transitionStage === 'logo-hold') ? 'logo-hold' : 'idle';
  });

  // Track root theme state
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fallbackDepartments = [
    { id: 1, name: 'Engineering', code: 'ENG', managerName: 'Jane Doe', headcount: 8, openRoles: 2, shortDescription: 'Core software engineering, platform development, and technical infrastructure operations.', designations: ['Software Engineer', 'Lead Architect', 'DevOps Specialist'] },
    { id: 2, name: 'Marketing', code: 'MKT', managerName: 'Amit Singh', headcount: 3, openRoles: 1, shortDescription: 'Brand strategy, advertising campaigns, and public relations growth operations.', designations: ['Marketing Coordinator', 'Creative Lead'] },
    { id: 3, name: 'Finance', code: 'FIN', managerName: 'Neha Sharma', headcount: 2, openRoles: 0, shortDescription: 'Financial planning, asset management, and payroll compliance administration.', designations: ['Finance Executive', 'Internal Auditor'] },
    { id: 4, name: 'Human Resources', code: 'HR', managerName: 'Priya Sharma', headcount: 4, openRoles: 1, shortDescription: 'Human resources, talent acquisition, recruitment pipelines, and onboarding compliance.', designations: ['HR Manager', 'Recruiting Specialist'] },
    { id: 5, name: 'Corporate Administration', code: 'CORP', managerName: 'System Admin', headcount: 1, openRoles: 0, shortDescription: 'Executive leadership, organizational strategy, and administrative alignment.', designations: ['Operations Lead'] }
  ];

  useEffect(() => {
    const fetchShowcaseData = async () => {
      try {
        const res = await fetch(`${API_BASE}/organizations/public-showcase`);
        if (res.ok) {
          const data = await res.json();
          if (data.departments && data.departments.length > 0) {
            setDepartments(data.departments.slice(0, 5));
          } else {
            setDepartments(fallbackDepartments);
          }
        } else {
          setDepartments(fallbackDepartments);
        }
      } catch (err) {
        console.warn('Backend fetch failed, using fallback static data:', err.message);
        setDepartments(fallbackDepartments);
      } finally {
        setLoading(false);
      }
    };
    fetchShowcaseData();
  }, []);

  // Sync transition stages
  useEffect(() => {
    if (prefersReducedMotion) {
      setShowcaseStage('idle');
      return;
    }

    if (!transitionStage || transitionStage === 'idle') {
      setShowcaseStage('idle');
      return;
    }

    if (transitionStage === 'curtain-opening' || transitionStage === 'logo-hold') {
      setShowcaseStage('logo-hold');
    } else if (transitionStage === 'revealing') {
      // If we are still loading, hold the logo (extend stage)
      if (loading) return;
      setShowcaseStage('revealing');
    }
  }, [transitionStage, loading, prefersReducedMotion]);

  // Modal Focus Trap
  useEffect(() => {
    if (!showModal || !selectedDept) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = modalElement.querySelectorAll(focusableSelectors);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    setTimeout(() => {
      firstElement.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) { 
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { 
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    modalElement.addEventListener('keydown', handleKeyDown);
    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, selectedDept]);

  const handleOpenModal = (dept, event) => {
    triggerRef.current = event.currentTarget;
    setSelectedDept(dept);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDept(null);
    setTimeout(() => {
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    }, 50);
  };

  const getDeptIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('code')) return <Code2 size={36} />;
    if (lower.includes('market') || lower.includes('mkt')) return <Megaphone size={36} />;
    if (lower.includes('fin') || lower.includes('pay') || lower.includes('audit') || lower.includes('dollar')) return <DollarSign size={36} />;
    if (lower.includes('hr') || lower.includes('people') || lower.includes('recru') || lower.includes('users')) return <Users size={36} />;
    return <Briefcase size={36} />;
  };

  const getDeptColor = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('code')) return '#3b82f6';
    if (lower.includes('market') || lower.includes('mkt')) return '#ec4899';
    if (lower.includes('fin') || lower.includes('pay') || lower.includes('audit') || lower.includes('dollar')) return '#10b981';
    if (lower.includes('hr') || lower.includes('people') || lower.includes('recru') || lower.includes('users')) return '#eab308';
    return '#a855f7';
  };

  // Pre-calculated style objects to keep markup clean
  const containerBg = isDarkMode ? '#030712' : '#f8fafc';
  const textColor = isDarkMode ? '#f9fafb' : '#0f172a';
  const mutedTextColor = isDarkMode ? '#9ca3af' : '#475569';
  const cardBg = isDarkMode ? '#0f172a' : '#ffffff';
  const cardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)';

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: containerBg,
      color: textColor,
      padding: '40px',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      
      {/* Centered Logo Hold Screen */}
      <AnimatePresence>
        {showcaseStage === 'logo-hold' && !prefersReducedMotion && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            background: 'transparent'
          }}>
            <motion.div 
              layout 
              layoutId="syncra-logo"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
              }}
              initial={{ opacity: 0, scale: 1.6 }}
              animate={{ opacity: 1, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <img 
                src={logoImg} 
                alt="Syncra logo" 
                style={{ 
                  width: '50px', 
                  height: '50px', 
                  objectFit: 'contain', 
                  borderRadius: '12px' 
                }} 
              />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                fontWeight: '900',
                letterSpacing: '2px',
                background: isDarkMode ? 'linear-gradient(to right, #ffffff, #94a3b8)' : 'linear-gradient(to right, #0f172a, #475569)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                SYNCRA ENTERPRISE
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Reveal */}
      <motion.div
        style={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={showcaseStage !== 'logo-hold' ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Top navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto 40px auto'
        }}>
          <button 
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: mutedTextColor,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.color = mutedTextColor}
          >
            ← Back to Hub
          </button>

          {/* Normal Header Logo Position */}
          {showcaseStage !== 'logo-hold' && !prefersReducedMotion && (
            <motion.div 
              layout 
              layoutId="syncra-logo"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
              }}
              transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
            >
              <img 
                src={logoImg} 
                alt="Syncra logo" 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  objectFit: 'contain', 
                  borderRadius: '6px' 
                }} 
              />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: '800',
                letterSpacing: '1px',
                background: isDarkMode ? 'linear-gradient(to right, #ffffff, #94a3b8)' : 'linear-gradient(to right, #0f172a, #475569)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                SYNCRA ENTERPRISE
              </span>
            </motion.div>
          )}

          <div style={{ width: '100px' }} />
        </div>

        {/* Header title */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: '800',
            letterSpacing: '1.5px',
            color: textColor,
            marginBottom: '12px'
          }}>
            EXPLORE TECHNOVA GLOBAL
          </h2>
          <p style={{
            fontSize: '15px',
            color: mutedTextColor,
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            Explore TechNova Global's departments before you sign in. Select a department card to view open vacancies, headcount analytics, and team roles.
          </p>
        </div>

        {/* Grid structure */}
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate={showcaseStage !== 'logo-hold' ? "visible" : "hidden"}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            flexGrow: 1
          }}
        >
          {loading ? (
            <div style={{ gridColumn: 'span 5', textAlign: 'center', color: mutedTextColor, fontSize: '15px', padding: '40px' }}>
              Compiling showcase parameters...
            </div>
          ) : (
            departments.map((dept) => {
              const cardColor = getDeptColor(dept.name);
              return (
                <motion.div
                  key={dept.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-haspopup="dialog"
                  onClick={(e) => handleOpenModal(dept, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenModal(dept, e);
                    }
                  }}
                  style={{
                    backgroundColor: cardBg,
                    border: cardBorder,
                    borderRadius: '20px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    aspectRatio: '1/1',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = cardColor;
                    e.currentTarget.style.boxShadow = isDarkMode 
                      ? `0 10px 30px -10px ${cardColor}40` 
                      : `0 10px 30px -10px ${cardColor}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  className="showcase-card"
                >
                  {/* Left-edge color accent line */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '5px',
                    height: '100%',
                    backgroundColor: cardColor
                  }} />

                  {/* Top Icon */}
                  <div style={{ color: cardColor, display: 'flex', alignItems: 'center', justifySelf: 'center', marginTop: '10px' }}>
                    {getDeptIcon(dept.name)}
                  </div>

                  {/* Body Details */}
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 0' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '17px',
                      fontWeight: '700',
                      color: textColor,
                      marginBottom: '8px',
                      lineHeight: '1.2'
                    }}>
                      {dept.name}
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: mutedTextColor,
                      lineHeight: '1.4',
                      maxHeight: '40px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {dept.shortDescription}
                    </p>
                  </div>

                  {/* Small Stat Line at bottom */}
                  <div style={{ 
                    fontSize: '11px', 
                    color: isDarkMode ? '#6b7280' : '#64748b', 
                    fontFamily: 'monospace', 
                    borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)', 
                    width: '100%', 
                    paddingTop: '12px',
                    marginTop: '10px'
                  }}>
                    {dept.headcount} employees · {dept.openRoles} open roles
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Styled Focus outlines and separator */}
        <style>{`
          .showcase-card:focus-visible {
            outline: 2px solid var(--pastel-red);
            outline-offset: 2px;
            border-color: var(--pastel-red) !important;
            transform: translateY(-4px);
          }
        `}</style>

        {/* Separator Line */}
        <hr style={{
          border: '0',
          borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          margin: '50px 0 30px 0',
          width: '100%'
        }} />

        {/* Manual Sign-In CTA Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button 
            onClick={onManualLogin}
            className="btn-primary"
            style={{
              maxWidth: '220px',
              width: '100%',
              padding: '14px 24px',
              fontSize: '14.5px',
              boxShadow: '0 4px 14px rgba(220, 80, 80, 0.35)'
            }}
          >
            Sign In
          </button>
        </div>
      </motion.div>

      {/* Department Detail Modal */}
      {showModal && selectedDept && (
        <div 
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDarkMode ? 'rgba(3, 7, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: cardBg,
              border: `1px solid ${getDeptColor(selectedDept.name)}`,
              borderRadius: '24px',
              padding: '30px',
              color: textColor,
              position: 'relative',
              boxShadow: isDarkMode 
                ? `0 20px 50px -15px ${getDeptColor(selectedDept.name)}30`
                : `0 20px 50px -15 rgba(0, 0, 0, 0.15)`
            }}
          >
            {/* Header close button */}
            <button
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                color: mutedTextColor,
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#0f172a';
                e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = mutedTextColor;
                e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
              }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            {/* Modal Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ color: getDeptColor(selectedDept.name) }}>
                {getDeptIcon(selectedDept.name)}
              </span>
              <div>
                <h3 
                  id="modal-title"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: '800',
                    margin: 0
                  }}
                >
                  {selectedDept.name} Showcase
                </h3>
                <span style={{ fontSize: '11px', color: isDarkMode ? '#6b7280' : '#64748b', fontFamily: 'monospace' }}>
                  DEPARTMENT CODE: {selectedDept.code}
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: isDarkMode ? '#6b7280' : '#64748b', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Operational Focus
              </h4>
              <p style={{ fontSize: '14px', color: isDarkMode ? '#cbd5e1' : '#334155', lineHeight: '1.6', margin: 0 }}>
                {selectedDept.shortDescription}
              </p>
            </div>

            {/* Stat Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '12px', border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'block', fontSize: '11px', color: isDarkMode ? '#6b7280' : '#64748b', textTransform: 'uppercase' }}>Department Headcount</span>
                <strong style={{ fontSize: '20px', color: textColor }}>{selectedDept.headcount} active staff</strong>
              </div>
              <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '12px', border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'block', fontSize: '11px', color: isDarkMode ? '#6b7280' : '#64748b', textTransform: 'uppercase' }}>Open Job Listings</span>
                <strong style={{ fontSize: '20px', color: getDeptColor(selectedDept.name) }}>{selectedDept.openRoles} openings</strong>
              </div>
            </div>

            {/* Department Manager */}
            <div style={{ marginBottom: '24px', background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '12px', border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ display: 'block', fontSize: '11px', color: isDarkMode ? '#6b7280' : '#64748b', textTransform: 'uppercase' }}>Department Director</span>
              <strong style={{ fontSize: '15px', color: textColor }}>{selectedDept.managerName}</strong>
            </div>

            {/* Designations list */}
            <div>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: isDarkMode ? '#6b7280' : '#64748b', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Operational Roles / Designations
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedDept.designations && selectedDept.designations.length > 0 ? (
                  selectedDept.designations.map((designation, idx) => (
                    <span 
                      key={idx}
                      style={{
                        fontSize: '12px',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        color: mutedTextColor
                      }}
                    >
                      {designation}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: isDarkMode ? '#6b7280' : '#64748b' }}>No specific designations registered in this unit.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentShowcase;
