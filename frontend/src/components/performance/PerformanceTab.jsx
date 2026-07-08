import React, { useState, useEffect } from 'react';
import { Target, Star, Award, Plus } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function PerformanceTab({ user }) {
  const [goals, setGoals] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeView, setActiveView] = useState('goals'); // 'goals', 'reviews', 'manager'

  // Goal Form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalEmpId, setGoalEmpId] = useState('');
  const [goalText, setGoalText] = useState('');
  const [goalKpi, setGoalKpi] = useState('');
  const [goalQuarter, setGoalQuarter] = useState('Q1');
  const [goalYear, setGoalYear] = useState('2026');

  // Self Assessment Form
  const [showSelfForm, setShowSelfForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selfRating, setSelfRating] = useState('5');
  const [selfFeedback, setSelfFeedback] = useState('');

  // Manager Evaluation Form
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [managerRating, setManagerRating] = useState('5');
  const [managerFeedback, setManagerFeedback] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('wfm_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchGoals = async () => {
    try {
      const res = await fetch(`${API_BASE}/performance/goals`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllGoals = async () => {
    if (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'HR') return;
    try {
      const res = await fetch(`${API_BASE}/performance/goals/all`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllGoals(data.goals || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/employees?limit=100`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGoals();
    fetchAllGoals();
    fetchEmployees();
    if (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'HR') {
      setActiveView('manager');
    }
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/performance/goals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          employeeId: parseInt(goalEmpId),
          quarter: goalQuarter,
          year: parseInt(goalYear),
          goal: goalText,
          kpiTarget: goalKpi
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Performance goal assigned successfully.');
        setShowGoalForm(false);
        setGoalText(''); setGoalKpi('');
        fetchAllGoals();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Goal setting transaction failed.');
    }
  };

  const handleSelfAssess = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/performance/goals/${selectedGoal.id}/self-assess`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          selfRating: parseFloat(selfRating),
          selfFeedback
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Self-assessment log updated.');
        setShowSelfForm(false);
        setSelfFeedback('');
        fetchGoals();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Evaluation transaction failed.');
    }
  };

  const handleManagerReview = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/performance/goals/${selectedGoal.id}/review`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          managerRating: parseFloat(managerRating),
          managerFeedback
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Manager evaluation feedback logged.');
        setShowEvalForm(false);
        setManagerFeedback('');
        fetchAllGoals();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to submit evaluation.');
    }
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
          {(user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'HR') && (
            <button
              onClick={() => setActiveView('manager')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeView === 'manager' ? '#eff6ff' : 'transparent', color: activeView === 'manager' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Evaluator Panel
            </button>
          )}
          <button
            onClick={() => setActiveView('goals')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeView === 'goals' ? '#eff6ff' : 'transparent', color: activeView === 'goals' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
          >
            My Goals
          </button>
        </div>

        {activeView === 'manager' && (
          <button
            onClick={() => setShowGoalForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--pastel-red)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <Plus size={16} /> Establish Goal
          </button>
        )}
      </div>

      {/* 1. EVALUATOR PANEL VIEW */}
      {activeView === 'manager' && (
        <div className="auth-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #cbd5e1', maxWidth: '100%' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
            Staff Performance Goals Administration
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 8px' }}>Employee Name</th>
                <th style={{ padding: '10px 8px' }}>Goal Description</th>
                <th style={{ padding: '10px 8px' }}>KPI Target</th>
                <th style={{ padding: '10px 8px' }}>Self Assessment</th>
                <th style={{ padding: '10px 8px' }}>Manager Rating</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {allGoals.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{g.employee_name} ({g.employee_id})</td>
                  <td style={{ padding: '10px 8px' }}>{g.goal}</td>
                  <td style={{ padding: '10px 8px' }}>{g.kpi_target}</td>
                  <td style={{ padding: '10px 8px' }}>{g.self_rating ? `${g.self_rating}/5` : 'Pending'}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{g.manager_rating ? `${g.manager_rating}/5` : '--/5'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: g.status === 'Reviewed' ? '#dcfce7' : '#eff6ff', color: g.status === 'Reviewed' ? '#166534' : '#2563eb', fontWeight: 'bold' }}>
                      {g.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {g.status === 'Self-Assessed' && (
                      <button
                        onClick={() => { setSelectedGoal(g); setShowEvalForm(true); }}
                        style={{ padding: '4px 8px', fontSize: '11.5px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Evaluate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. EMPLOYEE PERSONAL GOALS VIEW */}
      {activeView === 'goals' && (
        <div className="auth-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #cbd5e1', maxWidth: '100%' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
            Your Quarters Target Goals
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 8px' }}>Period</th>
                <th style={{ padding: '10px 8px' }}>Target Goal</th>
                <th style={{ padding: '10px 8px' }}>KPI Threshold</th>
                <th style={{ padding: '10px 8px' }}>Self Assessment</th>
                <th style={{ padding: '10px 8px' }}>Manager Evaluation</th>
                <th style={{ padding: '10px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{g.quarter} {g.year}</td>
                  <td style={{ padding: '10px 8px' }}>{g.goal}</td>
                  <td style={{ padding: '10px 8px' }}>{g.kpi_target}</td>
                  <td style={{ padding: '10px 8px' }}>{g.self_rating ? `${g.self_rating}/5` : 'Pending'}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{g.manager_rating ? `${g.manager_rating}/5` : 'Pending'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {g.status === 'Open' && (
                      <button
                        onClick={() => { setSelectedGoal(g); setShowSelfForm(true); }}
                        style={{ padding: '4px 8px', fontSize: '11px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Self Assess
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Goal Creation Modal */}
      {showGoalForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleCreateGoal} className="auth-card" style={{ padding: '30px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Assign Performance Target Goal</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={goalEmpId}
                required
                onChange={(e) => setGoalEmpId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Select Target Employee</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>)}
              </select>
              <select
                value={goalQuarter}
                onChange={(e) => setGoalQuarter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Q1">Quarter 1 (Q1)</option>
                <option value="Q2">Quarter 2 (Q2)</option>
                <option value="Q3">Quarter 3 (Q3)</option>
                <option value="Q4">Quarter 4 (Q4)</option>
              </select>
              <select
                value={goalYear}
                onChange={(e) => setGoalYear(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
              <textarea
                placeholder="Core performance target description..."
                required
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
              />
              <input
                type="text"
                placeholder="KPI Target Metric (e.g. Sales quota, SLA %)"
                required
                value={goalKpi}
                onChange={(e) => setGoalKpi(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Assign Goal</button>
              <button type="button" onClick={() => setShowGoalForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Self Assessment Modal */}
      {showSelfForm && selectedGoal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleSelfAssess} className="auth-card" style={{ padding: '30px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Submit Target Self-Evaluation</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>Assessing goal: <strong>{selectedGoal.goal}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={selfRating}
                onChange={(e) => setSelfRating(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="5">5/5 - Outstanding</option>
                <option value="4">4/5 - Exceeds Expectations</option>
                <option value="3">3/5 - Meets Expectations</option>
                <option value="2">2/5 - Needs Improvement</option>
                <option value="1">1/5 - Unsatisfactory</option>
              </select>
              <textarea
                placeholder="Self feedback details..."
                required
                value={selfFeedback}
                onChange={(e) => setSelfFeedback(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Submit Assessment</button>
              <button type="button" onClick={() => setShowSelfForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Manager Evaluation Modal */}
      {showEvalForm && selectedGoal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleManagerReview} className="auth-card" style={{ padding: '30px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Publish Manager Review</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>Assessing employee goal: <strong>{selectedGoal.goal}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={managerRating}
                onChange={(e) => setManagerRating(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="5">5/5 - Outstanding</option>
                <option value="4">4/5 - Exceeds Expectations</option>
                <option value="3">3/5 - Meets Expectations</option>
                <option value="2">2/5 - Needs Improvement</option>
                <option value="1">1/5 - Unsatisfactory</option>
              </select>
              <textarea
                placeholder="Manager written feedback details..."
                required
                value={managerFeedback}
                onChange={(e) => setManagerFeedback(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Publish Review</button>
              <button type="button" onClick={() => setShowEvalForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
