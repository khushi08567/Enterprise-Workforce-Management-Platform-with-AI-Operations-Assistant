import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Briefcase, 
  FileText, 
  Trash2, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  Search, 
  Clock, 
  TrendingUp, 
  Eye, 
  Calendar,
  Lock,
  Mail,
  Copy
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

const EmployeesTab = ({ user, prefilledOnboarding, onClearPrefill, initialDeptFilter, onClearDeptFilter }) => {
  const [subTab, setSubTab] = useState('directory'); // 'directory', 'add', 'team', 'invites'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDetails, setEmpDetails] = useState(null);
  const [empDocs, setEmpDocs] = useState([]);
  const [empTimeline, setEmpTimeline] = useState([]);
  const [directReports, setDirectReports] = useState([]);
  
  // Invites state
  const [invites, setInvites] = useState([]);
  const [inviteRole, setInviteRole] = useState('Employee');
  const [inviteOrg, setInviteOrg] = useState('');
  const [inviteRolesList, setInviteRolesList] = useState([]);

  // Search & Filter & Pagination
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Wizard State (Onboarding)
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    name: '', email: '', mobile: '', address: '', gender: 'Male', bloodGroup: 'O+', dob: '',
    departmentId: '', designationId: '', joiningDate: '', reportingManagerId: '',
    employmentType: 'Full-time', salaryGrade: 'G3', salary: '80000',
    role: 'Employee', internshipEndDate: '',
    documents: [] // Array of { type, url }
  });

  // Local helper states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState('personal'); // 'personal', 'professional', 'documents', 'timeline', 'payroll'

  // Document Upload UI Mocks
  const [uploadingDocType, setUploadingDocType] = useState('Aadhaar');
  const [mockUploadUrl, setMockUploadUrl] = useState('');

  const token = localStorage.getItem('wfm_token');
  const isHR = ['Super Admin', 'Organization Admin', 'Admin', 'HR Manager', 'HR'].includes(user.role);
  const isFinance = ['Super Admin', 'Organization Admin', 'Admin', 'Finance Executive', 'Finance'].includes(user.role);
  const canSeeSalary = ['Super Admin', 'Organization Admin', 'Admin', 'HR Manager', 'HR', 'Finance Executive', 'Finance'].includes(user.role);

  useEffect(() => {
    if (prefilledOnboarding) {
      setWizardForm(prev => ({
        ...prev,
        name: prefilledOnboarding.name || '',
        email: prefilledOnboarding.email || '',
        designationId: prefilledOnboarding.designationId || '',
        salary: String(prefilledOnboarding.salary || '80000'),
        joiningDate: prefilledOnboarding.joiningDate || ''
      }));
      setWizardStep(1);
      setSubTab('add');
      onClearPrefill();
    }
  }, [prefilledOnboarding]);

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchEmployees = async () => {
    try {
      let url = `${API_BASE}/employees?limit=${limit}&offset=${offset}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (deptFilter) url += `&departmentId=${deptFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartmentsAndDesignations = async () => {
    try {
      const resD = await fetch(`${API_BASE}/organizations`, { headers: getHeaders() });
      if (resD.ok) {
        const data = await resD.json();
        setDepartments(data.organizations || []);
        if (data.organizations && data.organizations.length > 0 && !inviteOrg) {
          setInviteOrg(data.organizations[0].name);
        }
      }
      const resDes = await fetch(`${API_BASE}/designations`, { headers: getHeaders() });
      if (resDes.ok) {
        const data = await resDes.json();
        setDesignations(data.designations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyTeam = async () => {
    try {
      const res = await fetch(`${API_BASE}/employees/me/team`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDirectReports(data.team || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await fetch(`${API_BASE}/invites`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const fetchInviteRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/roles`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setInviteRolesList(data.roles || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: inviteRole,
          organization: inviteOrg || (departments[0] ? departments[0].name : '')
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate invite code.');

      triggerMessage('success', 'New onboarding invite code generated.');
      fetchInvites();
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Copied invite code: ${code}`);
  };

  useEffect(() => {
    if (initialDeptFilter && departments.length > 0) {
      const match = departments.find(d => d.name.toLowerCase() === initialDeptFilter.toLowerCase());
      if (match) {
        setDeptFilter(match.id);
        setOffset(0);
        setSubTab('directory');
      }
      if (typeof onClearDeptFilter === 'function') {
        onClearDeptFilter();
      }
    }
  }, [initialDeptFilter, departments, onClearDeptFilter]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartmentsAndDesignations();
    if (subTab === 'team') {
      fetchMyTeam();
    }
    if (subTab === 'invites') {
      fetchInvites();
      fetchInviteRoles();
    }
  }, [subTab, search, deptFilter, statusFilter, offset]);

  const triggerMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Fetch individual details
  const handleSelectEmployee = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEmpDetails(data.employee);
        setEmpDocs(data.documents || []);
        setEmpTimeline(data.timeline || []);
        setSelectedEmp(id);
        setActiveProfileTab('personal');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvHeaders = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Status', 'Employment Type', 'Joining Date'];
    const rows = employees.map(emp => [
      emp.employee_id,
      emp.name,
      emp.email,
      emp.department_name || 'Unassigned',
      emp.designation_title || 'Unassigned',
      emp.status,
      emp.employment_type,
      emp.joining_date
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employee_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Document upload mock simulation (Representing Cloudinary storage URLs)
  const handleAddDocumentMock = () => {
    if (!mockUploadUrl.trim()) {
      triggerMessage('error', 'Please enter a valid document link/name.');
      return;
    }
    const newDoc = {
      type: uploadingDocType,
      url: mockUploadUrl
    };
    setWizardForm(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc]
    }));
    setMockUploadUrl('');
    triggerMessage('success', `${uploadingDocType} uploaded successfully.`);
  };

  // Onboarding Submit
  const handleOnboardSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(wizardForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('success', 'Employee onboarded! Login account initialized and welcome email dispatched.');
        setSubTab('directory');
        setWizardStep(1);
        setWizardForm({
          name: '', email: '', mobile: '', address: '', gender: 'Male', bloodGroup: 'O+', dob: '',
          departmentId: '', designationId: '', joiningDate: '', reportingManagerId: '',
          employmentType: 'Full-time', salaryGrade: 'G3', salary: '80000',
          role: 'Employee', internshipEndDate: '',
          documents: []
        });
        fetchEmployees();
      } else {
        triggerMessage('error', data.error || 'Onboarding failed.');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Soft delete / archive
  const handleArchiveEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to separation/archive this employee?')) return;
    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerMessage('success', 'Employee status updated to separated/archived.');
        fetchEmployees();
        setSelectedEmp(null);
      }
    } catch (err) {
      triggerMessage('error', err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Feedback */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: '8px',
          background: message.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {/* Directory subtabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', gap: '8px' }}>
        {[
          { id: 'directory', label: 'Employee Directory', icon: Users },
          { id: 'add', label: 'Onboard New Employee', icon: UserPlus },
          { id: 'team', label: 'My Direct Reports', icon: Briefcase },
          { id: 'invites', label: 'Onboarding Invites', icon: Mail }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;

          // Only show onboarding & invites to HR/Admins
          if ((tab.id === 'add' || tab.id === 'invites') && !isHR) return null;

          return (
            <button
              key={tab.id}
              onClick={() => { setSubTab(tab.id); setSelectedEmp(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                fontSize: '13.5px'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="fade-in">

        {/* 1. DIRECTORY VIEW */}
        {subTab === 'directory' && !selectedEmp && (
          <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
            
            {/* Search & Filter Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', flexGrow: 1 }}>
                
                {/* Search Employees */}
                <div style={{ position: 'relative', width: '300px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search name, email, EMP ID..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Filter Department */}
                <select
                  value={deptFilter}
                  onChange={(e) => { setDeptFilter(e.target.value); setOffset(0); }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.filter(d => d.status === 'Active').map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Separated</option>
                </select>
              </div>

              {/* Export CSV */}
              <button 
                className="btn-secondary" 
                onClick={handleExportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}
              >
                <Download size={14} /> Export Directory
              </button>
            </div>

            {/* Employees Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '12px 8px' }}>EMP ID</th>
                  <th style={{ padding: '12px 8px' }}>Name</th>
                  <th style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>Department</span>
                      <select
                        value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setOffset(0); }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11px',
                          fontWeight: 'normal',
                          backgroundColor: '#ffffff',
                          color: '#334155',
                          outline: 'none',
                          maxWidth: '130px',
                          marginTop: '2px'
                        }}
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th style={{ padding: '12px 8px' }}>Designation</th>
                  <th style={{ padding: '12px 8px' }}>Manager</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr 
                    key={emp.id} 
                    onClick={() => handleSelectEmployee(emp.id)}
                    style={{ borderBottom: '1px solid #e2e8f0', color: '#334155', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{emp.employee_id}</td>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>{emp.name}</td>
                    <td style={{ padding: '12px 8px' }}>{emp.department_name || 'Unassigned'}</td>
                    <td style={{ padding: '12px 8px' }}>{emp.designation_title || 'Unassigned'}</td>
                    <td style={{ padding: '12px 8px' }}>{emp.manager_name || 'CEO / Board'}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        background: emp.status === 'Active' ? '#d1fae5' : '#fee2e2',
                        color: emp.status === 'Active' ? '#065f46' : '#ef4444'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Showing {employees.length} of {totalCount} employees
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset(prev => Math.max(0, prev - limit))}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary"
                  disabled={offset + limit >= totalCount}
                  onClick={() => setOffset(prev => prev + limit)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1.1 EMPLOYEE DETAILS SHEET VIEW */}
        {selectedEmp && empDetails && (
          <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
            
            {/* Header / Back Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <button 
                  onClick={() => { setSelectedEmp(null); setEmpDetails(null); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', padding: 0, marginBottom: '8px' }}
                >
                  <ArrowLeft size={14} /> Back to Directory
                </button>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '20px', color: '#1e293b' }}>
                  {empDetails.name} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>({empDetails.employee_id})</span>
                </h3>
              </div>
              {isHR && empDetails.status === 'Active' && (
                <button 
                  className="btn-secondary" 
                  onClick={() => handleArchiveEmployee(empDetails.id)}
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                >
                  Archive/Separate Employee
                </button>
              )}
            </div>

            {/* Profile Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '12px', marginBottom: '20px' }}>
              {[
                { id: 'personal', label: 'Personal Details' },
                { id: 'professional', label: 'Professional Details' },
                { id: 'documents', label: 'Documents' },
                { id: 'timeline', label: 'Timeline Visual' },
                { id: 'payroll', label: 'Payroll Info' }
              ].map(pTab => {
                // Gate Payroll to HR + Finance only
                if (pTab.id === 'payroll' && !canSeeSalary) return null;
                const isActive = activeProfileTab === pTab.id;
                return (
                  <button
                    key={pTab.id}
                    onClick={() => setActiveProfileTab(pTab.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '8px 12px',
                      borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                      color: isActive ? '#2563eb' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? '600' : '400'
                    }}
                  >
                    {pTab.label}
                  </button>
                );
              })}
            </div>

            {/* Profile Tab Contents */}
            <div className="fade-in">
              
              {/* Personal Details */}
              {activeProfileTab === 'personal' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '13.5px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Full Name</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.name}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Email Address</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.email}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Mobile Number</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.mobile || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Home Address</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.address || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Gender</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.gender || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Blood Group</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.blood_group || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Date of Birth</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.dob || 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Professional Details */}
              {activeProfileTab === 'professional' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '13.5px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Employee ID</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.employee_id}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Department</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.department_name || 'Unassigned'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Designation</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.designation_title || 'Unassigned'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Joining Date</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.joining_date}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Reporting Manager</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.manager_name || 'None'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Employment Type</label>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.employment_type}</div>
                  </div>
                </div>
              )}

              {/* Documents Upload list */}
              {activeProfileTab === 'documents' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700' }}>Compliance Uploads</h4>
                  
                  {empDocs.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>No documents uploaded yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                      {empDocs.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', background: '#f8fafc' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#334155' }}>📄 {doc.type}</span>
                          <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>
                            Download/Preview Link
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline visual history */}
              {activeProfileTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px', borderLeft: '2px solid #e2e8f0', marginLeft: '12px', marginTop: '10px' }}>
                  {empTimeline.map(ev => {
                    const parsed = ev.meta ? JSON.parse(ev.meta) : {};
                    return (
                      <div key={ev.id} style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-31px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: ev.event_type === 'Joined' ? '#10b981' : ev.event_type === 'Promoted' ? '#3b82f6' : '#64748b',
                          border: '2px solid #ffffff'
                        }} />
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{ev.event_date}</span>
                        <h4 style={{ margin: '2px 0', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                          {ev.event_type}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                          {parsed.note || `Lifecycle status update: ${ev.event_type}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Payroll tab (Gated by RBAC) */}
              {activeProfileTab === 'payroll' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '13.5px' }}>
                  {canSeeSalary ? (
                    <>
                      <div>
                        <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Salary Grade</label>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{empDetails.salary_grade || 'Not Grade Mapped'}</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Base Salary (Annual)</label>
                        <div style={{ fontWeight: '700', color: '#059669', fontSize: '16px' }}>
                          ${empDetails.salary ? empDetails.salary.toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ colSpan: '2', textAlign: 'center', padding: '16px', color: '#ef4444' }}>
                      <Lock size={16} /> Salary visibility is restricted.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* 2. ONBOARDING NEW EMPLOYEE WIZARD */}
        {subTab === 'add' && isHR && (
          <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
            
            {/* Wizard Header Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
                HR Onboarding Wizard
              </h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', fontWeight: '600', color: '#64748b' }}>
                <span style={{ color: wizardStep === 1 ? '#2563eb' : 'inherit' }}>Step 1: Enter Profile</span>
                <span style={{ color: wizardStep === 2 ? '#2563eb' : 'inherit' }}>Step 2: Upload Documents</span>
                <span style={{ color: wizardStep === 3 ? '#2563eb' : 'inherit' }}>Step 3: Assignments</span>
              </div>
            </div>

            {/* Step 1: Details */}
            {wizardStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setWizardStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.name}
                      onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                      required
                    />
                    <label className="form-label">Full Name</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="email"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.email}
                      onChange={(e) => setWizardForm({ ...wizardForm, email: e.target.value })}
                      required
                    />
                    <label className="form-label">Email Address</label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.mobile}
                      onChange={(e) => setWizardForm({ ...wizardForm, mobile: e.target.value })}
                    />
                    <label className="form-label">Mobile Number</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.address}
                      onChange={(e) => setWizardForm({ ...wizardForm, address: e.target.value })}
                    />
                    <label className="form-label">Address</label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.gender}
                      onChange={(e) => setWizardForm({ ...wizardForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <label className="form-label">Gender</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.bloodGroup}
                      onChange={(e) => setWizardForm({ ...wizardForm, bloodGroup: e.target.value })}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <label className="form-label">Blood Group</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="date"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.dob}
                      onChange={(e) => setWizardForm({ ...wizardForm, dob: e.target.value })}
                    />
                    <label className="form-label">Date of Birth</label>
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  Proceed to Documents <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* Step 2: Upload Documents */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Document Type Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '16px', alignItems: 'end' }}>
                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={uploadingDocType}
                      onChange={(e) => setUploadingDocType(e.target.value)}
                    >
                      {['Aadhaar', 'PAN', 'Resume', 'Offer Letter', 'Certificates', 'Photo'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <label className="form-label">Document Type</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://cloudinary.com/doc..."
                      value={mockUploadUrl}
                      onChange={(e) => setMockUploadUrl(e.target.value)}
                    />
                    <label className="form-label">Document Link (Simulate Upload)</label>
                  </div>

                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={handleAddDocumentMock}
                    style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    <Upload size={14} /> Attach File
                  </button>
                </div>

                {/* List of Attached Docs */}
                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>Attached Documents:</h4>
                  {wizardForm.documents.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>No documents attached yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {wizardForm.documents.map((doc, idx) => (
                        <span key={idx} style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                          📄 {doc.type}
                          <button
                            type="button"
                            onClick={() => setWizardForm(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Back / Proceed row */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setWizardStep(1)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={() => setWizardStep(3)}
                    style={{ flexGrow: 1, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                  >
                    Proceed to Assignments <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            )}

            {/* Step 3: Assignments */}
            {wizardStep === 3 && (
              <form onSubmit={(e) => { e.preventDefault(); handleOnboardSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.departmentId}
                      onChange={(e) => setWizardForm({ ...wizardForm, departmentId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.filter(d => d.status === 'Active').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <label className="form-label">Assign Department</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.designationId}
                      onChange={(e) => setWizardForm({ ...wizardForm, designationId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Designation --</option>
                      {designations.map(des => (
                        <option key={des.id} value={des.id}>{des.title}</option>
                      ))}
                    </select>
                    <label className="form-label">Assign Designation</label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="date"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.joiningDate}
                      onChange={(e) => setWizardForm({ ...wizardForm, joiningDate: e.target.value })}
                      required
                    />
                    <label className="form-label">Joining Date</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.reportingManagerId}
                      onChange={(e) => setWizardForm({ ...wizardForm, reportingManagerId: e.target.value })}
                    >
                      <option value="">None (Reports to CEO)</option>
                      {employees.map(u => (
                        <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <label className="form-label">Reporting Manager</label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.employmentType}
                      onChange={(e) => setWizardForm({ ...wizardForm, employmentType: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Intern">Intern</option>
                    </select>
                    <label className="form-label">Employment Type</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.salaryGrade}
                      onChange={(e) => setWizardForm({ ...wizardForm, salaryGrade: e.target.value })}
                    />
                    <label className="form-label">Salary Grade</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="number"
                      className="form-control"
                      placeholder=" "
                      value={wizardForm.salary}
                      onChange={(e) => setWizardForm({ ...wizardForm, salary: e.target.value })}
                    />
                    <label className="form-label">Annual Base Salary ($)</label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: wizardForm.role === 'Intern' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={wizardForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setWizardForm({ 
                          ...wizardForm, 
                          role: newRole,
                          employmentType: newRole === 'Intern' ? 'Intern' : wizardForm.employmentType
                        });
                      }}
                      required
                    >
                      {['Super Admin', 'Organization Admin', 'HR Manager', 'Finance Executive', 'IT Administrator', 'Department Manager', 'Team Lead', 'Employee', 'Intern', 'Auditor'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <label className="form-label">Workspace Role Privilege</label>
                  </div>

                  {wizardForm.role === 'Intern' && (
                    <div className="form-group">
                      <input
                        type="date"
                        className="form-control"
                        placeholder=" "
                        value={wizardForm.internshipEndDate}
                        onChange={(e) => setWizardForm({ ...wizardForm, internshipEndDate: e.target.value })}
                        required
                      />
                      <label className="form-label">Internship End Date</label>
                    </div>
                  )}
                </div>

                {/* Back / Final Submit buttons */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setWizardStep(2)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ flexGrow: 1, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                    disabled={loading}
                  >
                    {loading ? 'Processing Onboarding...' : 'Final Onboard & Dispatch Invite'}
                  </button>
                </div>

              </form>
            )}

          </div>
        )}

        {/* 3. MY TEAM VIEW */}
        {subTab === 'team' && (
          <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👥 My Direct Reports
            </h3>
            
            {directReports.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '32px' }}>
                No active direct reports found for your profile.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                {directReports.map(rep => (
                  <div 
                    key={rep.id} 
                    onClick={() => handleSelectEmployee(rep.id)}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      transition: 'transform 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    <h4 style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#1e293b' }}>
                      {rep.name}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: '#64748b' }}>
                      {rep.designation_title || 'Software Developer'}
                    </p>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                      ID: {rep.employee_id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* 4. ONBOARDING INVITES VIEW */}
        {subTab === 'invites' && isHR && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px', width: '100%' }}>
            {/* Active Invites List Table */}
            <div className="auth-card" style={{ maxWidth: '100%', padding: '30px' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} strokeWidth={1.75} /> Onboarding Invite Codes
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Manage and copy active registration tokens for onboarding team members.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(74, 46, 42, 0.08)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Invite Code</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Role</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Department</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Status</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-dark)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.length > 0 ? (
                      invites.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid rgba(74, 46, 42, 0.04)' }}>
                          <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{inv.code}</td>
                          <td style={{ padding: '12px 8px' }}>{inv.role}</td>
                          <td style={{ padding: '12px 8px' }}>{inv.organization}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={`user-badge ${inv.status === 'active' ? 'badge-employee' : 'badge-super-admin'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            {inv.status === 'active' ? (
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '11px', margin: 0 }}
                                onClick={() => handleCopyCode(inv.code)}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Copy size={12} strokeWidth={1.75} /> Copy
                                </span>
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Redeemed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No invite codes generated yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generate Code Form */}
            <div className="auth-card" style={{ maxWidth: '100%', padding: '30px', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                🎫 Generate Invite Token
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Create a locked invite link containing preset roles and organizational units.
              </p>

              <form onSubmit={handleCreateInvite}>
                <div className="form-group form-select-container">
                  <select
                    id="inviteRole"
                    className="form-control form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {inviteRolesList.map(r => (
                      <option key={r.id} value={r.name}>{r.name} (Level: {r.level})</option>
                    ))}
                  </select>
                  <label htmlFor="inviteRole" className="form-label">Assign Role Privilege</label>
                </div>

                <div className="form-group form-select-container">
                  <select
                    id="inviteOrg"
                    className="form-control form-select"
                    value={inviteOrg}
                    onChange={(e) => setInviteOrg(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {departments.filter(d => d.status === 'Active').map(org => (
                      <option key={org.id} value={org.name}>{org.name}</option>
                    ))}
                  </select>
                  <label htmlFor="inviteOrg" className="form-label">Assign Department Unit</label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading || departments.length === 0}>
                  {loading ? 'Generating Code...' : 'Generate Onboarding Token'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeesTab;
