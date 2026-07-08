import React, { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle, AlertTriangle, QrCode } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function AttendanceTab({ user }) {
  const [logs, setLogs] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  
  // States
  const [clockedIn, setClockedIn] = useState(false);
  const [todayLog, setTodayLog] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);

  // Correction Form
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [corrDate, setCorrDate] = useState('');
  const [corrIn, setCorrIn] = useState('');
  const [corrOut, setCorrOut] = useState('');
  const [corrReason, setCorrReason] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('wfm_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/history`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.attendance || []);
        
        // Check if clocked in today
        const todayStr = new Date().toISOString().split('T')[0];
        const today = data.attendance.find(log => log.date === todayStr);
        if (today) {
          setTodayLog(today);
          setClockedIn(!today.clock_out);
        } else {
          setTodayLog(null);
          setClockedIn(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingCorrections = async () => {
    if (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'HR') return;
    try {
      const res = await fetch(`${API_BASE}/attendance/corrections/pending`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchPendingCorrections();
  }, []);

  const handleClockIn = () => {
    setErrorMessage('');
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const res = await fetch(`${API_BASE}/attendance/clock-in`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            method: 'web'
          })
        });
        const data = await res.json();

        if (res.ok) {
          setSuccessMessage(`Clocked in successfully. Status: ${data.status}`);
          fetchLogs();
        } else {
          setErrorMessage(data.error || 'Failed to clock in.');
        }
      } catch (err) {
        setErrorMessage('Failed to connect to authentication server.');
      }
    }, () => {
      // User blocked geolocation - clock in remote/WFH
      submitClockInRemote();
    });
  };

  const submitClockInRemote = async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/clock-in`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ method: 'web' }) // triggers fallback to remote/WFH status
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Clocked in. Geolocation blocked - Status: ${data.status}`);
        fetchLogs();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to log remote clock in.');
    }
  };

  const handleClockOut = async () => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/attendance/clock-out`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Clocked out successfully. Working hours logged: ${data.hours} hrs`);
        fetchLogs();
      } else {
        setErrorMessage(data.error || 'Failed to clock out.');
      }
    } catch (err) {
      setErrorMessage('Failed to clock out.');
    }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/attendance/corrections`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          date: corrDate,
          requestedClockIn: corrIn,
          requestedClockOut: corrOut,
          reason: corrReason
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Correction request dispatched to your manager.');
        setShowCorrectionForm(false);
        setCorrDate(''); setCorrIn(''); setCorrOut(''); setCorrReason('');
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Correction application failed.');
    }
  };

  const handleApproveCorrection = async (id, action) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/corrections/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setSuccessMessage(`Correction request ${action}ed.`);
        fetchPendingCorrections();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
      
      {/* 1. MAIN WIDGET AND LOGS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Messages */}
        {errorMessage && (
          <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px' }}>
            {successMessage}
          </div>
        )}

        {/* Single-Tap Clock In/Out Panel */}
        <div className="auth-card" style={{ padding: '32px', textAlign: 'center', background: '#ffffff', border: '1px solid #cbd5e1' }}>
          <Clock size={40} color="#2563eb" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ margin: 0, fontWeight: '800', fontSize: '20px' }}>Daily Attendance Recorder</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 24px 0' }}>
            Verify your office radius coordinates or scan corporate barcodes.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            {!clockedIn ? (
              <button
                onClick={handleClockIn}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--pastel-red)',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Clock In Session
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#1e293b',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Clock Out Session
              </button>
            )}

            <button
              onClick={() => setQrOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 20px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              <QrCode size={20} /> Scanner
            </button>
          </div>
        </div>

        {/* Attendance logs history */}
        <div className="auth-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: '700' }}>Your Log History</h4>
            <button
              onClick={() => setShowCorrectionForm(true)}
              style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Request Correction
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px' }}>Clock In</th>
                <th style={{ padding: '8px' }}>Clock Out</th>
                <th style={{ padding: '8px' }}>Hours</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{log.date}</td>
                  <td style={{ padding: '8px' }}>{log.clock_in}</td>
                  <td style={{ padding: '8px' }}>{log.clock_out || '--:--'}</td>
                  <td style={{ padding: '8px' }}>{log.working_hours || '0'} hrs</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      background: log.status === 'Present' ? '#dcfce7' : log.status === 'Late' ? '#fef9c3' : '#eff6ff',
                      color: log.status === 'Present' ? '#166534' : log.status === 'Late' ? '#854d0e' : '#2563eb',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. SIDE PANEL (Approvals list for managers) */}
      <div>
        {(user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'HR') && (
          <div className="auth-card" style={{ padding: '20px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: 0, fontWeight: '700', marginBottom: '12px' }}>Corrections Approvals</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingCorrections.length === 0 ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>No pending correction requests.</p>
              ) : (
                pendingCorrections.map(c => (
                  <div key={c.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{c.employee_name} ({c.employee_id})</p>
                    <p style={{ margin: '0 0 2px 0', color: '#64748b' }}>Date: {c.date}</p>
                    <p style={{ margin: '0 0 8px 0', color: '#64748b' }}>Time: {c.requested_clock_in} - {c.requested_clock_out}</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleApproveCorrection(c.id, 'approve')}
                        style={{ flex: 1, padding: '4px', border: 'none', background: '#166534', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveCorrection(c.id, 'reject')}
                        style={{ flex: 1, padding: '4px', border: 'none', background: '#991b1b', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR scanner simulation modal */}
      {qrOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="auth-card" style={{ padding: '24px', maxWidth: '320px', background: 'white', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>Scan Office QR Code</h3>
            <div style={{ width: '200px', height: '200px', margin: '0 auto', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', color: 'white', position: 'relative' }}>
              <QrCode size={120} />
              <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', height: '2px', background: '#ef4444', animation: 'scan 2s infinite' }} />
            </div>
            <button
              onClick={() => { setQrOpen(false); handleClockIn(); }}
              style={{ width: '100%', marginTop: '20px', padding: '10px', borderRadius: '6px', border: 'none', background: 'var(--pastel-red)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Simulate Code Scan
            </button>
            <button
              onClick={() => setQrOpen(false)}
              style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Correction Form Modal */}
      {showCorrectionForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleCorrectionSubmit} className="auth-card" style={{ padding: '30px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Apply Attendance Adjustment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="date"
                required
                value={corrDate}
                onChange={(e) => setCorrDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="time"
                placeholder="Requested Clock In"
                required
                value={corrIn}
                onChange={(e) => setCorrIn(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="time"
                placeholder="Requested Clock Out"
                required
                value={corrOut}
                onChange={(e) => setCorrOut(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <textarea
                placeholder="Reason for correction request..."
                value={corrReason}
                onChange={(e) => setCorrReason(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Submit</button>
              <button type="button" onClick={() => setShowCorrectionForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
