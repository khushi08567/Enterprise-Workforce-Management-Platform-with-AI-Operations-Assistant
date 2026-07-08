import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle, Plus } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function PayrollTab({ user }) {
  const [payrolls, setPayrolls] = useState([]);
  const [allPayrolls, setAllPayrolls] = useState([]);
  const [activeView, setActiveView] = useState('employee'); // 'employee', 'admin'

  // Run Payroll Form
  const [showRunForm, setShowRunForm] = useState(false);
  const [runMonth, setRunMonth] = useState('1');
  const [runYear, setRunYear] = useState('2026');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('wfm_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchPayrolls = async () => {
    try {
      const res = await fetch(`${API_BASE}/payroll`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPayrolls(data.payrolls || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllPayrolls = async () => {
    if (user.role !== 'Finance' && user.role !== 'HR' && user.role !== 'Admin' && user.role !== 'Super Admin') return;
    try {
      const res = await fetch(`${API_BASE}/payroll/all`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllPayrolls(data.payrolls || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayrolls();
    fetchAllPayrolls();
    if (user.role === 'Finance' || user.role === 'HR' || user.role === 'Admin' || user.role === 'Super Admin') {
      setActiveView('admin');
    }
  }, []);

  const handleRunPayroll = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/payroll/run`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ month: parseInt(runMonth), year: parseInt(runYear) })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Payroll batch run successfully! Generated ${data.generatedCount} statements.`);
        setShowRunForm(false);
        fetchAllPayrolls();
      } else {
        setErrorMessage(data.error || 'Failed to run payroll.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to authentication server.');
    }
  };

  const handleApprovePayroll = async (payrollId) => {
    try {
      const res = await fetch(`${API_BASE}/payroll/${payrollId}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setSuccessMessage('Payroll payslip approved and released.');
        fetchAllPayrolls();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getMonthName = (m) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || 'Month';
  };

  return (
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

      {/* Tabs Menu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(user.role === 'Finance' || user.role === 'HR' || user.role === 'Admin' || user.role === 'Super Admin') && (
            <button
              onClick={() => setActiveView('admin')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeView === 'admin' ? '#eff6ff' : 'transparent', color: activeView === 'admin' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Payroll Administration
            </button>
          )}
          <button
            onClick={() => setActiveView('employee')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeView === 'employee' ? '#eff6ff' : 'transparent', color: activeView === 'employee' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
          >
            My Payslips
          </button>
        </div>

        {activeView === 'admin' && (
          <button
            onClick={() => setShowRunForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--pastel-red)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <Plus size={16} /> Run Payroll Batch
          </button>
        )}
      </div>

      {/* 1. ADMINISTRATION VIEW */}
      {activeView === 'admin' && (
        <div className="auth-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #cbd5e1', maxWidth: '100%' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
            Corporate Payroll Batch Overview
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 8px' }}>Employee</th>
                <th style={{ padding: '10px 8px' }}>Period</th>
                <th style={{ padding: '10px 8px' }}>Basic Salary</th>
                <th style={{ padding: '10px 8px' }}>Overtime Pay</th>
                <th style={{ padding: '10px 8px' }}>Net Salary</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allPayrolls.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{p.employee_name} ({p.employee_id})</td>
                  <td style={{ padding: '10px 8px' }}>{getMonthName(p.month)} {p.year}</td>
                  <td style={{ padding: '10px 8px' }}>${p.basic_salary.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>${p.overtime_pay.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>${p.net_salary.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: p.status === 'Approved' ? '#dcfce7' : '#f1f5f9', color: p.status === 'Approved' ? '#166534' : '#475569', fontWeight: 'bold' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {p.status === 'Draft' && (
                        <button
                          onClick={() => handleApprovePayroll(p.id)}
                          style={{ padding: '4px 8px', fontSize: '11.5px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve Release
                        </button>
                      )}
                      <a
                        href={`${API_BASE}/payroll/${p.id}/payslip?token=${token}`}
                        download
                        style={{ padding: '4px 8px', fontSize: '11.5px', background: '#475569', color: 'white', borderRadius: '4px', textDecoration: 'none' }}
                      >
                        Download PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. EMPLOYEE PERSONAL PAYSLIPS VIEW */}
      {activeView === 'employee' && (
        <div className="auth-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #cbd5e1', maxWidth: '100%' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
            Your Monthly Salary Slips
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 8px' }}>Statement Period</th>
                <th style={{ padding: '10px 8px' }}>Net Salary Disbursed</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Statement</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{getMonthName(p.month)} {p.year}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#166534' }}>${p.net_salary.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: p.status === 'Approved' ? '#dcfce7' : '#f1f5f9', color: p.status === 'Approved' ? '#166534' : '#475569', fontWeight: 'bold' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <a
                      href={`${API_BASE}/payroll/${p.id}/payslip?token=${token}`}
                      download
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '11.5px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      <FileText size={12} /> Payslip PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Run Payroll Form Modal */}
      {showRunForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleRunPayroll} className="auth-card" style={{ padding: '30px', maxWidth: '380px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Run Monthly Payroll Batch</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={runMonth}
                onChange={(e) => setRunMonth(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
              <select
                value={runYear}
                onChange={(e) => setRunYear(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Run Generator</button>
              <button type="button" onClick={() => setShowRunForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
