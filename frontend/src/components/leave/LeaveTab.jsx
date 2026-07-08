import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function LeaveTab({ user }) {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Form
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('wfm_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchBalances = async () => {
    try {
      const res = await fetch(`${API_BASE}/leave/balances`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBalances(data.balances || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/leave/requests`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRequests = async () => {
    if (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'HR') return;
    try {
      const res = await fetch(`${API_BASE}/leave/requests/pending`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchRequests();
    fetchPendingRequests();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/leave/apply`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ leaveType, startDate, endDate, reason })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Leave request submitted successfully. Duration: ${data.durationDays} days.`);
        setShowApplyForm(false);
        setStartDate(''); setEndDate(''); setReason('');
        fetchBalances();
        fetchRequests();
      } else {
        setErrorMessage(data.error || 'Failed to submit leave request.');
      }
    } catch (err) {
      setErrorMessage('Failed to submit request.');
    }
  };

  const handleCancelLeave = async (requestId) => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/leave/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Leave request cancelled successfully.');
        fetchBalances();
        fetchRequests();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to cancel request.');
    }
  };

  const handleApproveRequest = async (id, action) => {
    try {
      const res = await fetch(`${API_BASE}/leave/requests/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setSuccessMessage(`Leave request ${action}ed.`);
        fetchPendingRequests();
        fetchBalances();
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
      
      {/* 1. BALANCES AND HISTORY */}
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

        {/* Leave Balances Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {balances.map(b => (
            <div key={b.id} className="auth-card" style={{ padding: '20px', background: '#ffffff', border: '1px solid #cbd5e1', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{b.leave_type} Days</span>
              <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '8px 0', color: '#1e293b' }}>
                {b.max_days - b.used_days}
              </h2>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Allocated: {b.max_days} | Used: {b.used_days}</span>
            </div>
          ))}
        </div>

        {/* Leave Request logs */}
        <div className="auth-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontWeight: '700' }}>Your Leave Applications</h4>
            <button
              onClick={() => setShowApplyForm(true)}
              style={{ padding: '6px 12px', fontSize: '12px', border: 'none', background: 'var(--pastel-red)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Apply Leave
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '8px' }}>Type</th>
                <th style={{ padding: '8px' }}>Start Date</th>
                <th style={{ padding: '8px' }}>End Date</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{req.leave_type}</td>
                  <td style={{ padding: '8px' }}>{req.start_date}</td>
                  <td style={{ padding: '8px' }}>{req.end_date}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Pending' ? '#eff6ff' : '#fee2e2',
                      color: req.status === 'Approved' ? '#166534' : req.status === 'Pending' ? '#2563eb' : '#991b1b',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    {(req.status === 'Pending' || (req.status === 'Approved' && new Date(req.start_date) > new Date())) && (
                      <button
                        onClick={() => handleCancelLeave(req.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Cancel
                      </button>
                    )}
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
            <h4 style={{ margin: 0, fontWeight: '700', marginBottom: '12px' }}>Leave Approvals</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingRequests.length === 0 ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>No pending leave applications.</p>
              ) : (
                pendingRequests.map(r => (
                  <div key={r.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{r.employee_name} ({r.employee_id})</p>
                    <p style={{ margin: '0 0 2px 0', color: '#64748b' }}>Leave Type: {r.leave_type}</p>
                    <p style={{ margin: '0 0 2px 0', color: '#64748b' }}>Duration: {r.start_date} to {r.end_date}</p>
                    <p style={{ margin: '0 0 8px 0', color: '#475569', fontStyle: 'italic' }}>Reason: "{r.reason || 'None'}"</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleApproveRequest(r.id, 'approve')}
                        style={{ flex: 1, padding: '4px', border: 'none', background: '#166534', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveRequest(r.id, 'reject')}
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

      {/* Apply Leave Modal Form */}
      {showApplyForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleApplyLeave} className="auth-card" style={{ padding: '30px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Apply Leave Request</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Casual">Casual Leave (12 allocated)</option>
                <option value="Sick">Sick Leave (10 allocated)</option>
                <option value="Earned">Earned Leave (15 allocated)</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <textarea
                placeholder="Reason for leave request..."
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Submit Application</button>
              <button type="button" onClick={() => setShowApplyForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
