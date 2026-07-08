import React, { useState, useEffect, useRef } from 'react';

const DevDashboard = ({ onBackToGallery }) => {
  const [metrics, setMetrics] = useState({
    activeBranches: 0,
    commitsCount: 0,
    openPullRequests: 0,
    loggedHours: 0,
    completedTickets: 0,
    systemHealth: '0%'
  });
  
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState([
    { text: 'SYSTEM: Connecting to WFM Dev Shell v2.4...', type: 'sys' },
    { text: 'SYSTEM: Backend API: http://localhost:5000/api/v1', type: 'sys' },
    { text: 'SYSTEM: Verification server online. SQLite DB Connected.', type: 'sys' },
    { text: 'SYSTEM: Type /help to see all operational terminal commands.', type: 'sys' },
    { text: '', type: 'log' }
  ]);
  
  const terminalEndRef = useRef(null);

  // Fetch metrics from backend
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/v1/dev/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Error fetching metrics:', err.message);
        // Fallback to static mock metrics on network error
        setMetrics({
          activeBranches: 4,
          commitsCount: 284,
          openPullRequests: 2,
          loggedHours: 38.5,
          completedTickets: 12,
          systemHealth: '98%'
        });
      }
    };

    fetchMetrics();
  }, []);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    // Add user command to output
    const newUserLine = { text: `antigravity@wfm:~$ ${cmd}`, type: 'cmd' };
    let responseLines = [];

    // Parse commands
    const normalizedCmd = cmd.toLowerCase();
    
    if (normalizedCmd === '/help') {
      responseLines = [
        { text: 'Operational WFM Console Commands:', type: 'log' },
        { text: '  /status   - Prints Express server status and environment details.', type: 'log' },
        { text: '  /metrics  - Displays detailed workforce development statistics.', type: 'log' },
        { text: '  /logs     - Fetches recent diagnostic server reports from backend.', type: 'log' },
        { text: '  /health   - Pings backend operational status check.', type: 'log' },
        { text: '  /clear    - Clears the terminal screen buffer.', type: 'log' }
      ];
    } 
    else if (normalizedCmd === '/clear') {
      setTerminalOutput([]);
      setTerminalInput('');
      return;
    } 
    else if (normalizedCmd === '/status') {
      responseLines = [
        { text: '--- SERVICE STATUS REPORT ---', type: 'info' },
        { text: `Host Process: Node.js ${window.navigator.userAgent.includes('Chrome') ? 'Vite Engine V8' : 'Node CJS'}`, type: 'log' },
        { text: 'Database: SQLite 3 (database.sqlite file-sync active)', type: 'log' },
        { text: `JWT Key Status: ACTIVE (Secret: WFM_SECRET_KEY_2026)`, type: 'log' },
        { text: `Port: 5000 | Allowed Methods: GET, POST, OPTIONS`, type: 'log' },
        { text: 'API routes mounted: /auth/register, /auth/login, /auth/me, /dev/metrics, /dev/logs', type: 'log' }
      ];
    } 
    else if (normalizedCmd === '/metrics') {
      responseLines = [
        { text: '--- WORKFORCE DEVELOPMENT METRICS ---', type: 'info' },
        { text: `  Active Branches      : ${metrics.activeBranches}`, type: 'log' },
        { text: `  Logged Commits       : ${metrics.commitsCount} (main branch)`, type: 'log' },
        { text: `  Open Pull Requests   : ${metrics.openPullRequests}`, type: 'log' },
        { text: `  Weekly Coding Hours  : ${metrics.loggedHours} hrs`, type: 'log' },
        { text: `  Completed Tickets    : ${metrics.completedTickets}`, type: 'log' },
        { text: `  Workspace Integrity  : ${metrics.systemHealth}`, type: 'log' }
      ];
    } 
    else if (normalizedCmd === '/logs') {
      try {
        const response = await fetch('http://localhost:5000/api/v1/dev/logs');
        if (response.ok) {
          const data = await response.json();
          responseLines = [
            { text: '--- RETRIEVING SERVER DIAGNOSTIC LOGS ---', type: 'info' },
            ...data.logs.map(log => ({
              text: `[${log.type}] ${log.message}`,
              type: log.type === 'SUCCESS' ? 'success' : log.type === 'WARN' ? 'warn' : 'log'
            }))
          ];
        } else {
          throw new Error('Failed to fetch logs');
        }
      } catch (err) {
        responseLines = [
          { text: 'Error retrieving logs from backend api. Showing local fallback logs:', type: 'warn' },
          { text: '[INFO] SQLite tables compiled and validated.', type: 'log' },
          { text: '[SUCCESS] CORS configuration applied to localhost:5173.', type: 'success' },
          { text: '[WARN] Dev shell authentication pings exceeding 120ms.', type: 'warn' }
        ];
      }
    } 
    else if (normalizedCmd === '/health') {
      try {
        const start = performance.now();
        const response = await fetch('http://localhost:5000/api/status');
        const end = performance.now();
        if (response.ok) {
          responseLines = [
            { text: `Ping status: OK | Latency: ${Math.round(end - start)}ms`, type: 'success' },
            { text: `Payload: SQLite Database Connected`, type: 'log' }
          ];
        } else {
          throw new Error('Health check error');
        }
      } catch (err) {
        responseLines = [{ text: 'Ping failed: API server offline.', type: 'error' }];
      }
    } 
    else {
      responseLines = [
        { text: `wfm-shell: command not found: '${cmd}'.`, type: 'error' },
        { text: `Type /help to review available terminal options.`, type: 'log' }
      ];
    }

    setTerminalOutput(prev => [...prev, newUserLine, ...responseLines, { text: '', type: 'log' }]);
    setTerminalInput('');
  };

  return (
    <div className="gallery-wrapper" style={{ maxWidth: '1300px', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Dynamic Background Blur Blobs */}
      <div className="ambient-bg">
        <div className="ambient-blob ambient-yellow"></div>
        <div className="ambient-blob ambient-red"></div>
      </div>

      {/* Nav Header */}
      <header className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-dark)' }}>
            Interactive Developer Workspace
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '2px' }}>
            Template: <strong>Interactive Dev Showcase (Theme 8)</strong>
          </p>
        </div>
        <button className="btn-secondary" onClick={onBackToGallery}>
          ← Back to Templates
        </button>
      </header>

      {/* Workspace Split Layout */}
      <div className="dev-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px' }}>
        
        {/* Left Column: Metrics Cards Grid */}
        <div className="dev-metrics-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-dark)' }}>
            Development KPIs
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Card 1: Branches */}
            <div className="template-card card-coral-peach" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', aspectRation: '16/9' }}>
              <span className="card-badge" style={{ top: '10px', right: '10px' }}>GIT</span>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#5a1818', fontWeight: 700, letterSpacing: '0.5px' }}>Active Branches</h3>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#4A2E2A', margin: '10px 0 0 0' }}>{metrics.activeBranches}</p>
            </div>

            {/* Card 2: Commits */}
            <div className="template-card card-shifting-drift" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <span className="card-badge" style={{ top: '10px', right: '10px' }}>MAIN</span>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#5a1818', fontWeight: 700, letterSpacing: '0.5px' }}>Commits Count</h3>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#4A2E2A', margin: '10px 0 0 0' }}>{metrics.commitsCount}</p>
            </div>

            {/* Card 3: Pull Requests */}
            <div className="template-card card-mesh-aurora" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <span className="card-badge" style={{ top: '10px', right: '10px' }}>PR</span>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#5a1818', fontWeight: 700, letterSpacing: '0.5px' }}>Open Pull Requests</h3>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#4A2E2A', margin: '10px 0 0 0' }}>{metrics.openPullRequests}</p>
            </div>

            {/* Card 4: Logged Hours */}
            <div className="template-card card-butter-dots" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
              <span className="card-badge" style={{ top: '10px', right: '10px' }}>HOURS</span>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#826561', fontWeight: 700, letterSpacing: '0.5px' }}>Coding Hours</h3>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#4A2E2A', margin: '10px 0 0 0', zIndex: 5 }}>{metrics.loggedHours}h</p>
            </div>
          </div>

          {/* Additional static showcase card */}
          <div className="template-card card-sunset-slope" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#5a1818', fontWeight: 700, letterSpacing: '0.5px' }}>Deployment Status</h3>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#4A2E2A' }}>🟢 Production Build v1.2.4 Active</p>
            <p style={{ fontSize: '13px', color: '#5a1818', opacity: 0.85 }}>Merged branch 'feature/role-assignment' successfully. Next release scheduled for July 5th.</p>
          </div>
        </div>

        {/* Right Column: Console/Terminal Simulation */}
        <div className="dev-console-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-dark)' }}>
            System Diagnostic Shell
          </h2>
          
          <div className="terminal-box">
            {/* Terminal Top Window Bar */}
            <div className="terminal-titlebar">
              <div className="terminal-dots">
                <span className="tdot tdot-red"></span>
                <span className="tdot tdot-yellow"></span>
                <span className="tdot tdot-green"></span>
              </div>
              <span className="terminal-title">antigravity@wfm-shell: ~</span>
            </div>

            {/* Terminal Body Screen */}
            <div className="terminal-body">
              {terminalOutput.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`term-line term-line-${line.type}`}
                >
                  {line.text}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Terminal Input Form */}
            <form onSubmit={handleCommandSubmit} className="terminal-form">
              <span className="terminal-prompt">antigravity@wfm:~$ </span>
              <input
                type="text"
                className="terminal-input"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type command (e.g. /help, /status, /logs)..."
                autoFocus
              />
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DevDashboard;
