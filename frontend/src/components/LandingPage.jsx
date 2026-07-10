import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Calendar, DollarSign, Cpu, Laptop, Ticket, Terminal, ArrowRight, Bot, Mic, Sparkles, Sun, Moon } from 'lucide-react';

const LandingPage = ({ onEnter }) => {
  const [typedText, setTypedText] = useState('');
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, active: false });
  const consoleRef = useRef(null);
  const [logs, setLogs] = useState([]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const currentCenterRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const logTemplates = [
    "[SYSTEM] Initializing Syncra Core Node...",
    "[SYSTEM] Loading Decentralized Operations Kernel v1.0.4...",
    "[SECURITY] Establishing OAuth 2.0 and JWT token authentication channels...",
    "[DB] Connecting to primary SQLite Database: syncra_wfm.sqlite...",
    "[DB] Base tables validated: users (4), employees (4), organizations (12)...",
    "[AI] Spawning operations intelligence model: Rachel...",
    "[AI] Speech recognition voice gateway active...",
    "[AI] Natural Language Query SQL compiler initialized...",
    "[MODULE] Mounting corporate directory and access controls...",
    "[MODULE] Remuneration ledger synced: Basic salaries, tax brackets calibrated...",
    "[MODULE] Attendance logs verified: QR/Mic clocking streams live...",
    "[MODULE] Leave request status pipeline checking pending actions...",
    "[SYSTEM] All gates ready. Workforce OS running in secure sandbox."
  ];

  // 1. Typewriter Typing Effect for Heading 1
  useEffect(() => {
    const fullText = "Syncra Enterprise";
    let idx = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, idx + 1));
      idx++;
      if (idx >= fullText.length) {
        clearInterval(interval);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // 2. Interactive Canvas Particles (Google Antigravity Spiral Dashes centered on Mouse)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particles = [];
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Build concentric rings of dashes forming a localized soap bubble
    const buildGrid = () => {
      particles = [];
      const ringSpacing = 20;
      const maxRadius = 280; // Limit maximum bubble radius
      const ringCount = Math.floor(maxRadius / ringSpacing);

      for (let r = 1; r <= ringCount; r++) {
        const radius = r * ringSpacing;
        const circumference = 2 * Math.PI * radius;
        const dashDensity = 26; // Reduce number of dots by increasing spacing
        const count = Math.floor(circumference / dashDensity);

        for (let i = 0; i < count; i++) {
          const baseAngle = (i / count) * Math.PI * 2;
          const angleOffset = baseAngle + Math.log(radius) * 0.08;
          
          // Quadratic opacity falloff (fades to 0 at maxRadius, leaving the border undefined)
          const fadeRatio = 1 - (radius / maxRadius);
          const alpha = Math.pow(fadeRatio, 1.6) * 0.65;

          particles.push({
            distance: radius,
            angleOffset,
            width: Math.max(1.2, 2.2 - (radius / maxRadius) * 0.8),
            length: Math.max(2.5, 4.5 - (radius / maxRadius) * 1.5),
            alpha
          });
        }
      }
    };
    buildGrid();

    let rotationAngle = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let targetX = canvas.width / 2;
      let targetY = canvas.height / 2;

      if (mouseRef.current.active && mouseRef.current.x !== null) {
        targetX = mouseRef.current.x;
        targetY = mouseRef.current.y;
      }

      // Compute bubble center displacement for squishy drag inertia simulation
      const dragX = targetX - currentCenterRef.current.x;
      const dragY = targetY - currentCenterRef.current.y;

      // Glide center
      currentCenterRef.current.x += dragX * 0.08;
      currentCenterRef.current.y += dragY * 0.08;

      rotationAngle += 0.0006; // Majestic slow rotation

      const maxRadius = 280;

      particles.forEach(p => {
        const orbitAngle = p.angleOffset + rotationAngle;
        
        // Base coordinate relative to glide center
        let baseX = currentCenterRef.current.x + Math.cos(orbitAngle) * p.distance;
        let baseY = currentCenterRef.current.y + Math.sin(orbitAngle) * p.distance;

        // Apply dynamic squishy drag stretch (dashes stretch/lag based on speed of motion)
        const stretch = p.distance / maxRadius;
        baseX += dragX * stretch * 0.45;
        baseY += dragY * stretch * 0.45;

        // Base tangent direction
        let tx = -Math.sin(orbitAngle);
        let ty = Math.cos(orbitAngle);

        // Core repulsion bubble deflection centered on actual cursor
        if (mouseRef.current.active && mouseRef.current.x !== null) {
          const dx = baseX - mouseRef.current.x;
          const dy = baseY - mouseRef.current.y;
          const mouseDist = Math.sqrt(dx * dx + dy * dy);

          if (mouseDist < 250) {
            const pushForce = ((250 - mouseDist) / 250) * 12;
            const pushAngle = Math.atan2(dy, dx);
            baseX += Math.cos(pushAngle) * pushForce;
            baseY += Math.sin(pushAngle) * pushForce;

            const mouseTangentX = -Math.sin(pushAngle);
            const mouseTangentY = Math.cos(pushAngle);
            const blend = ((250 - mouseDist) / 250) * 0.55;

            const blendedX = tx * (1 - blend) + mouseTangentX * blend;
            const blendedY = ty * (1 - blend) + mouseTangentY * blend;
            
            const len = Math.sqrt(blendedX * blendedX + blendedY * blendedY);
            tx = blendedX / len;
            ty = blendedY / len;
          }
        }

        // Map iridescent spectrum to polar angle relative to screen center
        const relativeAngle = Math.atan2(baseY - currentCenterRef.current.y, baseX - currentCenterRef.current.x);
        const shiftedAngle = (relativeAngle + Math.PI * 0.85) % (Math.PI * 2);
        const hue = (shiftedAngle / (Math.PI * 2)) * 360;
        const isThemeLight = document.documentElement.getAttribute('data-theme') === 'light';
        const opacityMultiplier = isThemeLight ? 0.45 : 1.0;
        const colorStr = `hsla(${hue}, 85%, 65%, ${p.alpha * opacityMultiplier})`;

        // Draw the dash segment
        const halfLen = p.length;
        const x1 = baseX - tx * halfLen;
        const y1 = baseY - ty * halfLen;
        const x2 = baseX + tx * halfLen;
        const y2 = baseY + ty * halfLen;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = p.width;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      resizeCanvas();
      buildGrid();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 3. Simulated Kernel Log Stream
  useEffect(() => {
    let timeoutId;
    let logIdx = 0;
    const triggerLogs = () => {
      if (logIdx < logTemplates.length) {
        setLogs(prev => [...prev, logTemplates[logIdx]]);
        logIdx++;
        timeoutId = setTimeout(triggerLogs, Math.random() * 400 + 200);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setLogs([]);
        logIdx = 0;
        triggerLogs();
      }
    }, { threshold: 0.1 });

    if (consoleRef.current) {
      observer.observe(consoleRef.current);
    }
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  // Scroll to diagnostic console
  const handleScrollToConsole = () => {
    const section = document.getElementById('kernel-console');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <div 
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'var(--lp-bg)',
        backgroundImage: 'var(--lp-radial-bg)',
        color: 'var(--lp-text-primary)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      {/* Interactive Background Canvas */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'rgba(99, 102, 241, var(--lp-orb-opacity))', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '40%', right: '-10%', width: '35vw', height: '35vw', borderRadius: '50%', background: 'rgba(168, 85, 247, var(--lp-orb-opacity))', filter: 'blur(140px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header bar */}
      <header style={{
        width: '100%',
        padding: '24px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--lp-border)',
        zIndex: 10,
        background: 'var(--lp-header-bg)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            backgroundColor: 'var(--lp-accent)',
            backgroundImage: 'var(--lp-accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px var(--lp-btn-shadow)'
          }}>
            <Cpu size={18} color="white" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '19px',
            fontWeight: '800',
            letterSpacing: '1.5px',
            background: 'linear-gradient(to right, var(--lp-text-primary), var(--lp-text-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            WORKFORCE OS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--lp-btn-secondary-bg)',
              border: '1px solid var(--lp-btn-secondary-border)',
              color: 'var(--lp-text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '36px',
              height: '36px',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--lp-btn-secondary-hover-bg)';
              e.currentTarget.style.transform = 'translateY(-1.5px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--lp-btn-secondary-bg)';
              e.currentTarget.style.transform = 'none';
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>

          <button 
            onClick={() => onEnter('personaSelect')}
            style={{
              padding: '9px 24px',
              borderRadius: '99px',
              backgroundColor: 'var(--lp-btn-secondary-bg)',
              border: '1px solid var(--lp-btn-secondary-border)',
              color: 'var(--lp-btn-secondary-text)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '13px',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--lp-accent)';
              e.currentTarget.style.borderColor = 'var(--lp-accent)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-1.5px)';
              e.currentTarget.style.boxShadow = '0 4px 15px var(--lp-btn-shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--lp-btn-secondary-bg)';
              e.currentTarget.style.borderColor = 'var(--lp-btn-secondary-border)';
              e.currentTarget.style.color = 'var(--lp-btn-secondary-text)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section Container */}
      <section 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px',
          zIndex: 10,
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Operations Kernel Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '99px',
            backgroundColor: 'var(--lp-badge-bg)',
            border: '1px solid var(--lp-badge-border)',
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--lp-badge-text)',
            marginBottom: '32px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            boxShadow: '0 4px 20px rgba(99,102,241,0.05)'
          }}>
            <Shield size={13} />
            DECENTRALIZED OPERATIONS KERNEL
          </div>

          {/* Heading 1 (Typed text) */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '68px',
            fontWeight: '900',
            lineHeight: '1.05',
            letterSpacing: '-2px',
            color: 'var(--lp-text-primary)',
            marginBottom: '16px',
            minHeight: '80px'
          }}>
            {typedText}
            <span style={{ 
              display: 'inline-block',
              width: '4px',
              height: '50px',
              backgroundColor: 'var(--lp-accent)',
              marginLeft: '6px',
              animation: 'blink 0.9s infinite'
            }} />
          </h1>

          {/* Heading 2 (Subtitle resized slightly smaller) */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '38px',
            fontWeight: '700',
            lineHeight: '1.2',
            letterSpacing: '-0.75px',
            marginBottom: '24px',
            color: 'var(--lp-text-primary)'
          }}>
            The Future of{' '}
            <span style={{
              backgroundImage: 'var(--lp-accent-gradient-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Workforce Intelligence
            </span>
          </h2>

          {/* Description */}
          <p style={{
            fontSize: '17px',
            color: 'var(--lp-text-secondary)',
            lineHeight: '1.65',
            maxWidth: '650px',
            margin: '0 auto 40px auto'
          }}>
            A high-fidelity corporate operating system. Seamless onboarding, automated access control, auditing, and AI operations consolidated in one unified core.
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => onEnter('personaSelect')}
              className="access-btn"
              style={{
                padding: '14px 32px',
                borderRadius: '99px',
                backgroundColor: 'var(--lp-accent)',
                backgroundImage: 'var(--lp-accent-gradient)',
                border: 'none',
                color: '#ffffff',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 20px var(--lp-btn-shadow)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px var(--lp-btn-shadow-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 20px var(--lp-btn-shadow)';
              }}
            >
              Initialize Access Sequence{' '}
              <span className="arrow-icon-wrapper" style={{ display: 'inline-flex', alignItems: 'center', width: '16px', overflow: 'hidden' }}>
                <ArrowRight size={16} className="arrow-icon" />
              </span>
            </button>
            <button
              onClick={handleScrollToConsole}
              style={{
                padding: '14px 32px',
                borderRadius: '99px',
                backgroundColor: 'var(--lp-btn-secondary-bg)',
                border: '1px solid var(--lp-btn-secondary-border)',
                color: 'var(--lp-btn-secondary-text)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--lp-btn-secondary-hover-bg)';
                e.currentTarget.style.color = 'var(--lp-btn-secondary-hover-text)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--lp-btn-secondary-bg)';
                e.currentTarget.style.color = 'var(--lp-btn-secondary-text)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <Terminal size={15} /> Analyze Kernel Architecture
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section style={{ padding: '100px 40px', background: 'var(--lp-section-bg)', zIndex: 10, borderTop: '1px solid var(--lp-border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--lp-accent)', textTransform: 'uppercase', letterSpacing: '2px' }}>OS OVERVIEW</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', marginTop: '10px', color: 'var(--lp-text-primary)' }}>
              Consolidated Workforce Operating System
            </h3>
            <p style={{ color: 'var(--lp-text-secondary)', fontSize: '15px', maxWidth: '600px', margin: '12px auto 0 auto', lineHeight: '1.6' }}>
              Syncra bypasses fragmented systems by unifying directory tracking, analytical accounting, leaves, and AI automation within a single operational kernel.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '32px', borderRadius: '16px', transition: 'all 0.3s' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center', color: '#6366F1', marginBottom: '20px' }}>
                <Shield size={20} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '12px' }}>Role-Based Cryptographic Access</h4>
              <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
                State-checked logins and token validations prevent unauthorized access across recruitment channels, internal files, and pay ledgers.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '32px', borderRadius: '16px', transition: 'all 0.3s' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center', color: '#a855f7', marginBottom: '20px' }}>
                <Cpu size={20} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '12px' }}>Real-time Operations Engine</h4>
              <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
                A highly optimized backend stack provides sub-millisecond query compilations to serve telemetry, shifts, and corporate records immediately.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '32px', borderRadius: '16px', transition: 'all 0.3s' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center', color: '#22c55e', marginBottom: '20px' }}>
                <Sparkles size={20} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '12px' }}>Contextual AI Operations</h4>
              <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
                Rachel AI integrates deeply with SQLite schema to map human voice commands directly to structural data responses and navigation redirects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '100px 40px', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6366F1', textTransform: 'uppercase', letterSpacing: '2px' }}>INTEGRATED ARCHITECTURE</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', marginTop: '10px', color: '#ffffff' }}>
              Modular Workforce Components
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '15px', maxWidth: '600px', margin: '12px auto 0 auto', lineHeight: '1.6' }}>
              Every operational panel operates asynchronously but syncs with the unified core database registry.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { icon: <Users size={18} />, title: "Staff Directory", desc: "Corporate hierarchies, dynamic shift states, and comprehensive employee files." },
              { icon: <Calendar size={18} />, title: "Leave Pipeline", desc: "Interactive time-off submissions, balance calculators, and HR approval boards." },
              { icon: <DollarSign size={18} />, title: "Payroll Ledger", desc: "Salary logs, deductions breakdowns, and automated download receipts." },
              { icon: <Laptop size={18} />, title: "Hardware Assets", desc: "Device allocations custody tracking, tags, and status inventories." },
              { icon: <Ticket size={18} />, title: "IT Help Desk", desc: "Internal queue ticket processing, categories mapping, and support chat." },
              { icon: <Terminal size={18} />, title: "Diagnostics Kernel", desc: "Diagnostics console logging, telemetry auditing, and system logs." }
            ].map((f, i) => (
              <div 
                key={i}
                style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.03)', 
                  borderRadius: '12px', 
                  padding: '24px',
                  display: 'flex',
                  gap: '16px'
                }}
              >
                <div style={{ color: '#6366F1', marginTop: '3px' }}>{f.icon}</div>
                <div>
                  <h5 style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', marginBottom: '6px' }}>{f.title}</h5>
                  <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.5' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Rachel Showcase */}
      <section style={{ padding: '100px 40px', background: 'rgba(3, 7, 18, 0.4)', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'row', gap: '60px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 450px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6366F1', textTransform: 'uppercase', letterSpacing: '2px' }}>AI DELEGATION GATEWAY</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', marginTop: '10px', color: '#ffffff', lineHeight: '1.2' }}>
              Meet Rachel: The Operations AI
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '15px', marginTop: '16px', lineHeight: '1.6' }}>
              Syncra comes equipped with an intelligent operations assistant named **Rachel**. She is connected directly to backend services, allowing managers to request complex organizational data and navigate views via typing or hands-free voice query.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              {[
                "🎙️ Voice Speech Auto-Submit: Talk naturally, it sends automatically when you pause.",
                "📊 Direct Database Compilation: Runs analytical tables mapping users, payroll, and tasks.",
                "🧭 Dynamic Sidebar Navigation: Swap tabs (e.g. attendance clock) simply by requesting it."
              ].map((cap, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '13.5px', color: '#e5e7eb', alignItems: 'center' }}>
                  <span style={{ color: '#6366F1', fontWeight: 'bold' }}>✓</span>
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
            {/* Simulated Chat Interface */}
            <div style={{ width: '100%', maxWidth: '400px', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.15)', background: 'rgba(15, 23, 42, 0.8)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              
              <div style={{ padding: '16px', background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={20} />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 'bold' }}>Rachel</div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>Operations AI Copilot</div>
                </div>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* User query */}
                <div style={{ alignSelf: 'flex-end', background: '#6366F1', color: 'white', padding: '10px 14px', borderRadius: '12px 12px 0 12px', fontSize: '12.5px', maxWidth: '80%' }}>
                  show payroll costs for this month
                </div>

                {/* Assistant response */}
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f3f4f6', padding: '12px 14px', borderRadius: '12px 12px 12px 0', fontSize: '12px', maxWidth: '85%' }}>
                  <div style={{ color: '#818CF8', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>💵 PAYROLL SUMMARY</div>
                  I compiled the payroll ledger. Basic salary total: **$48,500** with **$9,800** in tax deductions.
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                        <th style={{ padding: '4px', textAlign: 'left' }}>Gross</th>
                        <th style={{ padding: '4px', textAlign: 'left' }}>Tax</th>
                        <th style={{ padding: '4px', textAlign: 'left' }}>Net Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px' }}>$48,500</td>
                        <td style={{ padding: '4px' }}>$9,800</td>
                        <td style={{ padding: '4px' }}>$38,700</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Input indicator */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', alignItems: 'center' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }}>
                    <Mic size={14} />
                  </div>
                  <div style={{ flex: 1, height: '32px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '11.5px', color: '#9ca3af' }}>
                    Listening... Speak now!
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Interactive System Log Auditor Section */}
      <section 
        id="kernel-console"
        ref={consoleRef} 
        style={{ 
          padding: '100px 40px', 
          zIndex: 10, 
          borderTop: '1px solid var(--lp-border)',
          background: 'var(--lp-radial-bg)'
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--lp-accent)', textTransform: 'uppercase', letterSpacing: '2px' }}>OS CORE DIAGNOSTIC</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', marginTop: '10px', color: 'var(--lp-text-primary)' }}>
              Workforce Operations Kernel Console
            </h3>
            <p style={{ color: 'var(--lp-text-secondary)', fontSize: '15px', marginTop: '10px' }}>
              Watch the operational sub-systems validate, mount, and interface with the AI operations assistant.
            </p>
          </div>

          {/* Simulated UNIX Terminal */}
          <div 
            style={{ 
              width: '100%', 
              height: '350px', 
              background: 'var(--lp-console-bg)', 
              border: '1px solid var(--lp-console-border)', 
              borderRadius: '12px', 
              padding: '24px', 
              fontFamily: 'monospace', 
              fontSize: '13px', 
              color: '#39ff14', 
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ color: 'var(--lp-text-secondary)', borderBottom: '1px solid var(--lp-console-border)', paddingBottom: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>SYSTEM DIAGNOSTIC RUNTIME - SECURE SHIELD ACTIVE</span>
              <span>PORT: 5000</span>
            </div>
            
            {logs.map((log, i) => (
              <div key={i} style={{ lineBreak: 'anywhere' }}>
                <span style={{ color: '#00bfff' }}>{`[${new Date().toLocaleTimeString()}]`}</span> {log}
              </div>
            ))}

            {logs.length < logTemplates.length && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--lp-text-primary)' }}>
                <span className="animate-pulse" style={{ display: 'inline-block', width: '8px', height: '14px', backgroundColor: '#39ff14' }} />
                <span>compiling kernel telemetry...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        width: '100%',
        padding: '60px 40px 30px 40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        background: 'rgba(3, 7, 18, 0.8)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '40px'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px' }}>
          
          <div style={{ maxWidth: '300px' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '1px', color: '#ffffff', display: 'block', marginBottom: '12px' }}>
              WORKFORCE OS
            </span>
            <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.6' }}>
              A secure, decentralized operational kernel for comprehensive enterprise staffing, analytics accounting, assets, and AI delegation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '60px', flexWrap: 'wrap' }}>
            <div>
              <h6 style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>SYSTEM GATEWAYS</h6>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><a onClick={() => onEnter('personaSelect')} style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#6366F1'} onMouseLeave={(e)=>e.currentTarget.style.color='#9ca3af'}>Initialize Access Sequence</a></li>
                <li><a onClick={() => onEnter('personaSelect')} style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#6366F1'} onMouseLeave={(e)=>e.currentTarget.style.color='#9ca3af'}>Sign In to Dashboard</a></li>
                <li><a onClick={handleScrollToConsole} style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.color='#6366F1'} onMouseLeave={(e)=>e.currentTarget.style.color='#9ca3af'}>Telemetry Auditor</a></li>
              </ul>
            </div>
            
            <div>
              <h6 style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>PLATFORM MODULES</h6>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><span style={{ color: '#9ca3af' }}>AI Operations (Rachel)</span></li>
                <li><span style={{ color: '#9ca3af' }}>Remuneration Ledger</span></li>
                <li><span style={{ color: '#9ca3af' }}>Attendance Audit</span></li>
                <li><span style={{ color: '#9ca3af' }}>Leave Tracker</span></li>
              </ul>
            </div>
          </div>

        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: '#9ca3af' }}>
          <span>© 2026 Syncra Enterprise. All Rights Reserved. Built under license OS-Kernel-1.0.4.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span>Syncra Core v1.0.4 - All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* Embedded cursor animation style & typewriter cursor blinking keyframe */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
