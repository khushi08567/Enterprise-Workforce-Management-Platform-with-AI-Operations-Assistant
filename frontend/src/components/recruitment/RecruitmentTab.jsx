import React, { useState, useEffect } from 'react';
import { Plus, User, Search, Award, FileText, Calendar, CheckCircle, ShieldAlert } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function RecruitmentTab({ user, onPrefillOnboarding }) {
  const [candidates, setCandidates] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [users, setUsers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [activeView, setActiveView] = useState('kanban'); // 'kanban', 'interviews', 'offers'

  // Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '', email: '', phone: '', resumeUrl: '',
    skills: '', experienceYears: 0, appliedForDesignationId: '', source: 'direct'
  });

  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [newInterview, setNewInterview] = useState({
    interviewerId: '', type: 'Technical', scheduledAt: ''
  });

  const [showOfferForm, setShowOfferForm] = useState(false);
  const [newOffer, setNewOffer] = useState({
    proposedSalary: '', proposedJoiningDate: ''
  });

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('wfm_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE}/recruitment/candidates`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await fetch(`${API_BASE}/designations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDesignations(data.designations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/roles/users`, { headers: getHeaders() }); // fallback user list
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      // Fallback
      setUsers([{ id: 1, name: 'System Admin' }]);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API_BASE}/recruitment/offers`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchDesignations();
    fetchUsers();
    fetchOffers();
  }, []);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const payload = {
        ...newCandidate,
        skills: newCandidate.skills.split(',').map(s => s.trim()).filter(Boolean)
      };

      const res = await fetch(`${API_BASE}/recruitment/candidates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Candidate registered successfully.');
        setShowAddForm(false);
        setNewCandidate({
          name: '', email: '', phone: '', resumeUrl: '',
          skills: '', experienceYears: 0, appliedForDesignationId: '', source: 'direct'
        });
        fetchCandidates();
      } else {
        setErrorMessage(data.error || 'Failed to create candidate.');
      }
    } catch (err) {
      setErrorMessage('Network error during candidate registration.');
    }
  };

  // Drag-and-drop Kanban handlers
  const handleDragStart = (e, candidateId) => {
    e.dataTransfer.setData('text/plain', candidateId);
  };

  const handleMoveCandidate = async (candidateId, targetStatus) => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/recruitment/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Candidate moved to ${targetStatus} successfully.`);
        fetchCandidates();
      } else {
        setErrorMessage(data.error || 'Kanban transition blocked.');
      }
    } catch (err) {
      setErrorMessage('Failed to perform stage transition.');
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('text/plain');
    if (candidateId) {
      await handleMoveCandidate(candidateId, targetStatus);
    }
  };

  const handleAnalyzeResume = async (candidateId) => {
    setAnalyzingId(candidateId);
    setAiAnalysis(null);
    try {
      const res = await fetch(`${API_BASE}/recruitment/candidates/${candidateId}/analyze`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/recruitment/interviews`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          ...newInterview
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Interview slot scheduled.');
        setShowInterviewForm(false);
        setNewInterview({ interviewerId: '', type: 'Technical', scheduledAt: '' });
      } else {
        setErrorMessage(data.error || 'Failed to schedule interview.');
      }
    } catch (err) {
      setErrorMessage('Failed to schedule interview.');
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/recruitment/offers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          ...newOffer
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Employment offer drafted.');
        setShowOfferForm(false);
        setNewOffer({ proposedSalary: '', proposedJoiningDate: '' });
        fetchOffers();
      } else {
        setErrorMessage(data.error || 'Failed to establish offer.');
      }
    } catch (err) {
      setErrorMessage('Network failure creating offer.');
    }
  };

  const handleApproveOffer = async (offerId) => {
    try {
      const res = await fetch(`${API_BASE}/recruitment/offers/${offerId}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setSuccessMessage('Offer approved by HR Manager and dispatched.');
        fetchOffers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      const res = await fetch(`${API_BASE}/recruitment/offers/${offerId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'Accepted' })
      });
      if (res.ok) {
        setSuccessMessage('Candidate accepted the offer!');
        fetchOffers();
        fetchCandidates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const kanbanColumns = ['Applied', 'Screening', 'Technical Interview', 'HR Interview', 'Offer', 'Joined', 'Rejected'];

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
          <button
            onClick={() => setActiveView('kanban')}
            className={`tab-btn ${activeView === 'kanban' ? 'active' : ''}`}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeView === 'kanban' ? '#eff6ff' : 'transparent', color: activeView === 'kanban' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setActiveView('offers')}
            className={`tab-btn ${activeView === 'offers' ? 'active' : ''}`}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeView === 'offers' ? '#eff6ff' : 'transparent', color: activeView === 'offers' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Offers Directory
          </button>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--pastel-red)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      {/* 1. KANBAN PIPELINE BOARD */}
      {activeView === 'kanban' && (
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {kanbanColumns.map(col => {
            const list = candidates.filter(c => c.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col)}
                style={{
                  minWidth: '260px',
                  background: 'var(--card-bg)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--sidebar-border)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>{col}</span>
                  <span style={{ fontSize: '11px', background: '#cbd5e1', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {list.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '300px' }}>
                  {list.map(cand => (
                    <div
                      key={cand.id}
                      className="org-floating-tile"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, cand.id)}
                      style={{
                        padding: '12px',
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{cand.name}</h4>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>{cand.designation_title || 'General Applicant'}</span>
                      </div>

                      {/* AI Resume Analyzer Widget */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {cand.ai_score !== null ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>AI Match Score:</span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: cand.ai_score >= 80 ? '#166534' : cand.ai_score >= 50 ? '#854d0e' : '#991b1b',
                              background: cand.ai_score >= 80 ? '#dcfce7' : cand.ai_score >= 50 ? '#fef9c3' : '#fee2e2',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {cand.ai_score}%
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAnalyzeResume(cand.id)}
                            disabled={analyzingId === cand.id}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: '#eff6ff',
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            {analyzingId === cand.id ? 'Analyzing...' : 'Run AI Match'}
                          </button>
                        )}
                      </div>

                      {/* Interactive Triggers */}
                      <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', alignItems: 'center' }}>
                        {cand.status !== 'Applied' && (
                          <button
                            title="Schedule Interview"
                            onClick={() => { setSelectedCandidate(cand); setShowInterviewForm(true); }}
                            style={{ padding: '4px', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}
                          >
                            <Calendar size={14} />
                          </button>
                        )}
                        {cand.status === 'HR Interview' && (
                          <button
                            title="Draft Offer"
                            onClick={() => { setSelectedCandidate(cand); setShowOfferForm(true); }}
                            style={{ padding: '4px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        <select
                          value={cand.status}
                          onChange={(e) => handleMoveCandidate(cand.id, e.target.value)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            cursor: 'pointer',
                            marginLeft: 'auto'
                          }}
                        >
                          {kanbanColumns.map(colName => (
                            <option key={colName} value={colName}>{colName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. OFFERS DIRECTORY */}
      {activeView === 'offers' && (
        <div className="auth-card" style={{ padding: '24px', maxWidth: '100%' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
            HR Offer Disbursal Pipeline
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 8px' }}>Candidate Name</th>
                <th style={{ padding: '10px 8px' }}>Designation</th>
                <th style={{ padding: '10px 8px' }}>Offered Salary</th>
                <th style={{ padding: '10px 8px' }}>Joining Date</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(off => (
                <tr key={off.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{off.candidate_name}</td>
                  <td style={{ padding: '10px 8px' }}>{off.designation_title}</td>
                  <td style={{ padding: '10px 8px' }}>${off.proposed_salary.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{off.proposed_joining_date}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: off.status === 'Accepted' ? '#dcfce7' : off.status === 'Sent' ? '#eff6ff' : '#f1f5f9', color: off.status === 'Accepted' ? '#166534' : off.status === 'Sent' ? '#2563eb' : '#475569', fontWeight: 'bold' }}>
                      {off.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {off.approved_by_hr === 0 ? (
                        <button
                          onClick={() => handleApproveOffer(off.id)}
                          style={{ padding: '4px 8px', fontSize: '11px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve Offer
                        </button>
                      ) : (
                        <>
                          <a
                            href={`${API_BASE}/recruitment/offers/${off.id}/pdf?token=${token}`}
                            download
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#475569', color: 'white', borderRadius: '4px', textDecoration: 'none' }}
                          >
                            PDF Letter
                          </a>
                          {off.status === 'Sent' && (
                            <button
                              onClick={() => handleAcceptOffer(off.id)}
                              style={{ padding: '4px 8px', fontSize: '11px', background: '#166534', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Simulate Accept
                            </button>
                          )}
                          {off.status === 'Accepted' && (
                            <button
                              onClick={() => onPrefillOnboarding({
                                name: off.candidate_name,
                                email: off.candidate_email,
                                designationId: off.applied_for_designation_id,
                                salary: off.proposed_salary,
                                joiningDate: off.proposed_joining_date
                              })}
                              style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--pastel-red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Convert to Employee
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Resume Analysis Results modal */}
      {aiAnalysis && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="auth-card" style={{ padding: '24px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="#2563eb" /> Claude Resume Scorecard
            </h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px' }}>
                Job Fit Assessment Score: <strong style={{ color: '#2563eb' }}>{aiAnalysis.score}%</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534' }}>Matched Competencies:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {aiAnalysis.matchedSkills.map(s => <span key={s} style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>{s}</span>)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#991b1b' }}>Missing Competencies:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {aiAnalysis.missingSkills.map(s => <span key={s} style={{ fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px' }}>{s}</span>)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setAiAnalysis(null)}
              style={{ width: '100%', marginTop: '20px', padding: '8px', borderRadius: '6px', border: 'none', background: '#475569', color: 'white', cursor: 'pointer' }}
            >
              Close Assessment
            </button>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleAddCandidate} className="auth-card" style={{ padding: '30px', maxWidth: '450px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Register Job Candidate</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Full Name"
                required
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={newCandidate.email}
                onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newCandidate.phone}
                onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="text"
                placeholder="Resume URL link"
                value={newCandidate.resumeUrl}
                onChange={(e) => setNewCandidate({ ...newCandidate, resumeUrl: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="text"
                placeholder="Skills (comma-separated, e.g. React, Node.js)"
                value={newCandidate.skills}
                onChange={(e) => setNewCandidate({ ...newCandidate, skills: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="number"
                placeholder="Years of Experience"
                value={newCandidate.experienceYears}
                onChange={(e) => setNewCandidate({ ...newCandidate, experienceYears: parseInt(e.target.value) || 0 })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <select
                value={newCandidate.appliedForDesignationId}
                onChange={(e) => setNewCandidate({ ...newCandidate, appliedForDesignationId: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Select Applied Designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Register</button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewForm && selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleScheduleInterview} className="auth-card" style={{ padding: '30px', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Schedule Interview</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>Booking meeting slot for: <strong>{selectedCandidate.name}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={newInterview.interviewerId}
                onChange={(e) => setNewInterview({ ...newInterview, interviewerId: e.target.value })}
                required
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Select Corporate Interviewer</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              <select
                value={newInterview.type}
                onChange={(e) => setNewInterview({ ...newInterview, type: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Technical">Technical Round</option>
                <option value="HR">HR Culture Fit Round</option>
              </select>
              <input
                type="datetime-local"
                value={newInterview.scheduledAt}
                required
                onChange={(e) => setNewInterview({ ...newInterview, scheduledAt: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Schedule Slot</button>
              <button type="button" onClick={() => setShowInterviewForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Offer Form Modal */}
      {showOfferForm && selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleCreateOffer} className="auth-card" style={{ padding: '30px', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Draft Employment Offer</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>Drafting contract parameters for: <strong>{selectedCandidate.name}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="number"
                placeholder="Proposed Annual Salary ($)"
                value={newOffer.proposedSalary}
                required
                onChange={(e) => setNewOffer({ ...newOffer, proposedSalary: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="date"
                value={newOffer.proposedJoiningDate}
                required
                onChange={(e) => setNewOffer({ ...newOffer, proposedJoiningDate: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Draft Contract</button>
              <button type="button" onClick={() => setShowOfferForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
