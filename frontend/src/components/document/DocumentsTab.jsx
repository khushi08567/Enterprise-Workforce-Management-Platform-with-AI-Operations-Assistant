import React, { useState, useEffect } from 'react';
import { Plus, FileText, Download, Shield, Eye, RefreshCcw } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function DocumentsTab({ user }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [versions, setVersions] = useState([]);

  // Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'Policy', fileUrl: '', visibility: 'org-wide', targetId: '' });
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  const [showVersionForm, setShowVersionForm] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState('');
  const [newVersionStr, setNewVersionStr] = useState('2.0');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('wfm_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocVersions = async (doc) => {
    setSelectedDoc(doc);
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/versions`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const resD = await fetch(`${API_BASE}/organizations`, { headers: getHeaders() });
      if (resD.ok) {
        const data = await resD.json();
        setDepartments(data.organizations || []);
      }
      const resR = await fetch(`${API_BASE}/roles`, { headers: getHeaders() });
      if (resR.ok) {
        const data = await resR.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch filters data:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchFiltersData();
  }, []);

  const handlePublishDoc = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        setSuccessMessage('Document published successfully.');
        setShowAddForm(false);
        setNewDoc({ title: '', category: 'Policy', fileUrl: '', visibility: 'org-wide', targetId: '' });
        fetchDocuments();
      } else {
        const data = await res.json();
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to publish document.');
    }
  };

  const handleUpdateVersion = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/documents/${selectedDoc.id}/version`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fileUrl: newVersionFile, version: newVersionStr })
      });
      if (res.ok) {
        setSuccessMessage('Document updated to new version.');
        setShowVersionForm(false);
        setNewVersionFile('');
        fetchDocuments();
        setSelectedDoc(null);
      } else {
        const data = await res.json();
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to update version.');
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

      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText color="#2563eb" /> Organization Document Repository
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--pastel-red)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Upload Policy
        </button>
      </div>

      {/* Documents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {documents.map(doc => (
          <div key={doc.id} className="auth-card" style={{ padding: '20px', background: 'white', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {doc.category}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>v{doc.version}</span>
              </div>
              <h4 style={{ margin: '12px 0 6px 0', fontSize: '14px', fontWeight: 'bold' }}>{doc.title}</h4>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Scope: {doc.visibility}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px' }}>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '11px', background: '#475569', color: 'white', textDecoration: 'none', borderRadius: '4px' }}
              >
                Open View
              </a>
              <button
                onClick={() => fetchDocVersions(doc)}
                style={{ flex: 1, padding: '6px', fontSize: '11px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                History
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Versions History Modal */}
      {selectedDoc && !showVersionForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="auth-card" style={{ padding: '30px', maxWidth: '450px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Version Logs: {selectedDoc.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '16px' }}>
              {versions.map(v => (
                <div key={v.id} style={{ fontSize: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>v{v.version}</strong> uploaded by {v.uploaded_by_name}
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>{v.created_at}</div>
                  </div>
                  <a href={v.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>Download</a>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowVersionForm(true)}
                style={{ flex: 1, padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Upload Revision
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{ flex: 1, padding: '8px', background: '#cbd5e1', color: '#1e293b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Version Form Modal */}
      {showVersionForm && selectedDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handleUpdateVersion} className="auth-card" style={{ padding: '30px', maxWidth: '380px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Publish Document Revision</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="New File URL link"
                required
                value={newVersionFile}
                onChange={(e) => setNewVersionFile(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="text"
                placeholder="Version String (e.g. 2.0)"
                required
                value={newVersionStr}
                onChange={(e) => setNewVersionStr(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Update Version</button>
              <button type="button" onClick={() => { setShowVersionForm(false); setSelectedDoc(null); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Document Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <form onSubmit={handlePublishDoc} className="auth-card" style={{ padding: '30px', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Publish Corporate Document</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Document Title"
                required
                value={newDoc.title}
                onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <select
                value={newDoc.category}
                onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="Policy">Policy Handbooks</option>
                <option value="Template">Work Templates</option>
                <option value="Handbook">Employee Handbooks</option>
                <option value="Legal">Legal Contracts</option>
                <option value="Other">Other Docs</option>
              </select>
              <input
                type="text"
                placeholder="File URL link"
                required
                value={newDoc.fileUrl}
                onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <select
                value={newDoc.visibility}
                onChange={(e) => setNewDoc({ ...newDoc, visibility: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="org-wide">Organization Wide (Public)</option>
                <option value="department-specific">Department Specific</option>
                <option value="role-restricted">Role Restricted</option>
              </select>
              {newDoc.visibility === 'department-specific' && (
                <select
                  required
                  value={newDoc.targetId}
                  onChange={(e) => setNewDoc({ ...newDoc, targetId: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                  ))}
                </select>
              )}
              {newDoc.visibility === 'role-restricted' && (
                <select
                  required
                  value={newDoc.targetId}
                  onChange={(e) => setNewDoc({ ...newDoc, targetId: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Select Role --</option>
                  {roles.length > 0 ? (
                    roles.map(r => (
                      <option key={r.id || r.name} value={r.name}>{r.name}</option>
                    ))
                  ) : (
                    ['Super Admin', 'Organization Admin', 'HR Manager', 'Finance Executive', 'IT Administrator', 'Department Manager', 'Team Lead', 'Employee', 'Intern', 'Auditor'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))
                  )}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--pastel-red)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Publish Document</button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
