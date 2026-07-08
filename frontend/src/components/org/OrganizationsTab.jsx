import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserPlus, 
  MapPin, 
  Clock, 
  Calendar, 
  GitPullRequest,
  Edit2, 
  Archive, 
  Plus, 
  Trash2, 
  Lock, 
  ChevronRight, 
  ChevronDown, 
  Copy,
  Users
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

const OrganizationsTab = ({ user }) => {
  const [subTab, setSubTab] = useState('departments'); // 'departments', 'designations', 'locations', 'shifts', 'holidays', 'reporting'
  
  // Data States
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Form & Interaction States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Modal / Editor States
  const [editingDept, setEditingDept] = useState(null);
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', parentId: '', managerId: '', status: 'Active' });

  const [editingDesig, setEditingDesig] = useState(null);
  const [showAddDesig, setShowAddDesig] = useState(false);
  const [desigForm, setDesigForm] = useState({ title: '', departmentId: '', level: 'Mid' });

  const [editingLoc, setEditingLoc] = useState(null);
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [locForm, setLocForm] = useState({ name: '', address: '', geoLat: 37.7749, geoLng: -122.4194, geoRadiusMeters: 100 });

  const [editingShift, setEditingShift] = useState(null);
  const [showAddShift, setShowAddShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, organizationId: '' });

  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'National', organizationId: '' });

  // Holiday Calendar Toggle
  const [holidayView, setHolidayView] = useState('calendar'); // 'calendar', 'list'
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // July (0-indexed 6)

  const token = localStorage.getItem('wfm_token');
  const isAdmin = user.role === 'Admin' || user.role === 'Super Admin';

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Fetch operations
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/organizations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.organizations || []);
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

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/office-locations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/work-shifts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_BASE}/holidays`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployeesAndUsers = async () => {
    try {
      const resEmp = await fetch(`${API_BASE}/employees?limit=200`, { headers: getHeaders() });
      if (resEmp.ok) {
        const data = await resEmp.json();
        setEmployees(data.employees || []);
      }
      const resUsers = await fetch(`${API_BASE}/auth/logs`, { headers: getHeaders() }).catch(() => null); 
      // fallback to custom retrieval or query logs if direct list is blocked
      const resAlt = await fetch(`${API_BASE}/dev/metrics`, { headers: getHeaders() });
      if (resAlt.ok) {
        const met = await resAlt.json();
        setUsersList(met.stats?.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchDesignations();
    fetchLocations();
    fetchShifts();
    fetchHolidays();
    fetchEmployeesAndUsers();
  }, [subTab]);

  // Initial expand logic
  useEffect(() => {
    if (departments.length > 0 && Object.keys(expandedNodes).length === 0) {
      const initial = {};
      departments.forEach(dept => {
        if (dept.parent_id === null) {
          initial[dept.id] = true;
          setSelectedNodeId(dept.id);
        }
      });
      setExpandedNodes(initial);
    }
  }, [departments]);

  // Toast feedback helper
  const triggerMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // CRUD handlers: Departments
  const handleSaveDept = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingDept ? `${API_BASE}/organizations/${editingDept.id}` : `${API_BASE}/organizations`;
      const method = editingDept ? 'PUT' : 'POST';
      const body = {
        name: deptForm.name,
        code: deptForm.code.toUpperCase(),
        parentId: deptForm.parentId ? parseInt(deptForm.parentId) : null,
        managerId: deptForm.managerId ? parseInt(deptForm.managerId) : null,
        status: deptForm.status
      };

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('success', editingDept ? 'Department updated successfully!' : 'Department created successfully!');
        fetchDepartments();
        setShowAddDept(false);
        setEditingDept(null);
        setDeptForm({ name: '', code: '', parentId: '', managerId: '', status: 'Active' });
      } else {
        triggerMessage('error', data.error || 'Operation failed');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveDept = async (id) => {
    if (!window.confirm('Are you sure you want to archive/delete this department?')) return;
    try {
      const res = await fetch(`${API_BASE}/organizations/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('success', 'Department archived successfully.');
        fetchDepartments();
      } else {
        triggerMessage('error', data.error || 'Failed to archive department.');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    }
  };

  // CRUD handlers: Designations
  const handleSaveDesig = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingDesig ? `${API_BASE}/designations/${editingDesig.id}` : `${API_BASE}/designations`;
      const method = editingDesig ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(desigForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('success', 'Designation saved successfully!');
        fetchDesignations();
        setShowAddDesig(false);
        setEditingDesig(null);
        setDesigForm({ title: '', departmentId: '', level: 'Mid' });
      } else {
        triggerMessage('error', data.error || 'Failed to save');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesig = async (id) => {
    if (!window.confirm('Delete this designation?')) return;
    try {
      const res = await fetch(`${API_BASE}/designations/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('success', 'Designation deleted.');
        fetchDesignations();
      } else {
        triggerMessage('error', data.error || 'Delete failed.');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    }
  };

  // CRUD handlers: Locations
  const handleSaveLoc = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingLoc ? `${API_BASE}/office-locations/${editingLoc.id}` : `${API_BASE}/office-locations`;
      const method = editingLoc ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(locForm)
      });
      if (res.ok) {
        triggerMessage('success', 'Office location saved.');
        fetchLocations();
        setShowAddLoc(false);
        setEditingLoc(null);
        setLocForm({ name: '', address: '', geoLat: 37.7749, geoLng: -122.4194, geoRadiusMeters: 100 });
      } else {
        triggerMessage('error', 'Operation failed.');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoc = async (id) => {
    if (!window.confirm('Delete this office location?')) return;
    try {
      const res = await fetch(`${API_BASE}/office-locations/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerMessage('success', 'Office deleted.');
        fetchLocations();
      }
    } catch (err) {
      triggerMessage('error', err.message);
    }
  };

  // CRUD handlers: Shifts
  const handleSaveShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingShift ? `${API_BASE}/work-shifts/${editingShift.id}` : `${API_BASE}/work-shifts`;
      const method = editingShift ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(shiftForm)
      });
      if (res.ok) {
        triggerMessage('success', 'Work shift saved.');
        fetchShifts();
        setShowAddShift(false);
        setEditingShift(null);
        setShiftForm({ name: '', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, organizationId: '' });
      }
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Delete this shift?')) return;
    try {
      const res = await fetch(`${API_BASE}/work-shifts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerMessage('success', 'Shift deleted.');
        fetchShifts();
      }
    } catch (err) {
      triggerMessage('error', err.message);
    }
  };

  // CRUD handlers: Holidays
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/holidays`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(holidayForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('success', 'Holiday registered!');
        fetchHolidays();
        setShowAddHoliday(false);
        setHolidayForm({ date: '', name: '', type: 'National', organizationId: '' });
      } else {
        triggerMessage('error', data.error || 'Failed');
      }
    } catch (err) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Remove this holiday?')) return;
    try {
      const res = await fetch(`${API_BASE}/holidays/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        triggerMessage('success', 'Holiday removed.');
        fetchHolidays();
      }
    } catch (err) {
      triggerMessage('error', err.message);
    }
  };

  // Recursive Tree rendering for Departments
  const renderDeptNode = (parentId, depth = 1) => {
    const allChildren = departments.filter(d => d.parent_id === parentId && d.status === 'Active');
    if (allChildren.length === 0) return null;

    return (
      <div className="tree-branch-container" style={{ display: expandedNodes[parentId] ? 'block' : 'none' }}>
        {allChildren.map(child => {
          const hasChildren = departments.some(d => d.parent_id === child.id && d.status === 'Active');
          const isExpanded = !!expandedNodes[child.id];
          const isSelected = selectedNodeId === child.id;

          return (
            <div key={child.id} className="tree-node-wrapper tree-child-node">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', position: 'relative' }}>
                {hasChildren ? (
                  <button 
                    type="button"
                    onClick={() => setExpandedNodes(prev => ({ ...prev, [child.id]: !prev[child.id] }))}
                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <div style={{ width: '22px' }} />
                )}

                <div 
                  className="tree-node-content"
                  onClick={() => setSelectedNodeId(child.id)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? '#2563eb' : 'rgba(74, 46, 42, 0.08)',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Building2 size={16} style={{ color: isSelected ? '#2563eb' : '#64748b' }} />
                  <div>
                    <span className="node-name" style={{ color: isSelected ? '#1e3a8a' : '#1e293b' }}>{child.name}</span>
                    <span style={{ fontSize: '10px', marginLeft: '6px', color: '#64748b', fontWeight: 'bold' }}>{child.code}</span>
                  </div>

                  {/* Manager detail badge */}
                  {child.manager_name && (
                    <span style={{ fontSize: '10.5px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      👤 {child.manager_name}
                    </span>
                  )}

                  {/* Employee count badge */}
                  <span style={{ fontSize: '10.5px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {child.employee_count || 0} staff
                  </span>

                  {/* Actions (Admins only) */}
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDept(child);
                          setDeptForm({
                            name: child.name,
                            code: child.code || '',
                            parentId: child.parent_id || '',
                            managerId: child.manager_id || '',
                            status: child.status || 'Active'
                          });
                          setShowAddDept(true);
                        }}
                        style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px' }}
                        title="Edit Department"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveDept(child.id);
                        }}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        title="Archive Department"
                      >
                        <Archive size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {hasChildren && renderDeptNode(child.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Recursive Person-Based Reporting Hierarchy rendering
  const renderReportingNode = (managerId) => {
    const directReports = employees.filter(e => e.reporting_manager_id === managerId);
    if (directReports.length === 0) return null;

    return (
      <div className="tree-branch-container" style={{ paddingLeft: '28px', borderLeft: '1px solid #e2e8f0', marginLeft: '14px' }}>
        {directReports.map(rep => (
          <div key={rep.id} style={{ margin: '8px 0', position: 'relative' }}>
            <div 
              className="tree-node-content"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <strong>{rep.name}</strong> 
              <span style={{ fontSize: '11px', color: '#64748b' }}>({rep.designation_title || 'Employee'})</span>
            </div>
            {renderReportingNode(rep.user_id)}
          </div>
        ))}
      </div>
    );
  };

  // Holiday Helper for Calendar month grid calculations
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const renderHolidayCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const startDay = getFirstDayOfMonth(currentMonth, currentYear);
    const blanks = Array(startDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const cells = [...blanks, ...days];

    // Group holidays by date for this month
    const monthHolidays = holidays.filter(h => {
      const hDate = new Date(h.date);
      return hDate.getMonth() === currentMonth && hDate.getFullYear() === currentYear;
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return (
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>
            {monthNames[currentMonth]} {currentYear}
          </h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(prev => prev - 1);
                } else {
                  setCurrentMonth(prev => prev - 1);
                }
              }}
            >
              Prev
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(prev => prev + 1);
                } else {
                  setCurrentMonth(prev => prev + 1);
                }
              }}
            >
              Next
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ fontWeight: '600', color: '#64748b', fontSize: '12px' }}>{d}</div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={`blank-${idx}`} style={{ height: '48px' }} />;
            
            // Find holidays on this day
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayHolidays = monthHolidays.filter(h => h.date === dateStr);

            return (
              <div 
                key={`day-${day}`} 
                style={{ 
                  height: '48px', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: dayHolidays.length > 0 ? '#fee2e2' : '#ffffff',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b' }}>{day}</span>
                {dayHolidays.map(h => (
                  <span 
                    key={h.id} 
                    title={h.name}
                    style={{ 
                      fontSize: '8px', 
                      background: '#ef4444', 
                      color: '#ffffff', 
                      padding: '1px 4px', 
                      borderRadius: '3px', 
                      overflow: 'hidden', 
                      whiteSpace: 'nowrap', 
                      textOverflow: 'ellipsis',
                      width: '90%',
                      marginTop: '2px'
                    }}
                  >
                    {h.name}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast message display */}
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
          fontWeight: '500',
          animation: 'slideUp 0.3s ease'
        }}>
          {message.text}
        </div>
      )}

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', gap: '8px' }}>
        {[
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'designations', label: 'Designations', icon: UserPlus },
          { id: 'locations', label: 'Office Locations', icon: MapPin },
          { id: 'shifts', label: 'Work Shifts', icon: Clock },
          { id: 'holidays', label: 'Holidays Calendar', icon: Calendar },
          { id: 'reporting', label: 'Reporting Lines', icon: GitPullRequest }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
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
                fontSize: '13.5px',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub Tab Panel Content */}
      <div className="fade-in">

        {/* 1. DEPARTMENTS TREE VIEW */}
        {subTab === 'departments' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px' }}>
            <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
                  Enterprise Department Tree
                </h3>
                {isAdmin && (
                  <button 
                    className="btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ name: '', code: '', parentId: '', managerId: '', status: 'Active' });
                      setShowAddDept(true);
                    }}
                  >
                    <Plus size={14} /> Add Department
                  </button>
                )}
              </div>

              <div className="tree-container" style={{ background: '#fdfdfd', border: '1px solid rgba(74, 46, 42, 0.08)', borderRadius: '12px', padding: '24px', minHeight: '300px' }}>
                {departments.length > 0 ? (
                  departments.filter(d => d.parent_id === null && d.status === 'Active').map(root => {
                    const isSelected = selectedNodeId === root.id;
                    const isExpanded = !!expandedNodes[root.id];
                    const hasChildren = departments.some(d => d.parent_id === root.id && d.status === 'Active');

                    return (
                      <div key={root.id} className="tree-root-wrapper">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0', position: 'relative' }}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => setExpandedNodes(prev => ({ ...prev, [root.id]: !prev[root.id] }))}
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : (
                            <div style={{ width: '22px' }} />
                          )}

                          <div 
                            className="tree-node-content tree-root-node"
                            onClick={() => setSelectedNodeId(root.id)}
                            style={{
                              cursor: 'pointer',
                              borderColor: isSelected ? '#2563eb' : 'rgba(74, 46, 42, 0.12)',
                              background: isSelected ? '#eff6ff' : 'rgba(74, 46, 42, 0.04)',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                          >
                            <Crown size={16} style={{ color: '#eab308' }} />
                            <span className="node-name" style={{ color: isSelected ? '#1e3a8a' : '#1e293b' }}>{root.name}</span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>{root.code}</span>
                            
                            {root.manager_name && (
                              <span style={{ fontSize: '10.5px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
                                👤 {root.manager_name}
                              </span>
                            )}
                            
                            <span style={{ fontSize: '10.5px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '12px' }}>
                              {root.employee_count || 0} staff
                            </span>

                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDept(root);
                                    setDeptForm({
                                      name: root.name,
                                      code: root.code || '',
                                      parentId: root.parent_id || '',
                                      managerId: root.manager_id || '',
                                      status: root.status || 'Active'
                                    });
                                    setShowAddDept(true);
                                  }}
                                  style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveDept(root.id);
                                  }}
                                  style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Archive size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {hasChildren && renderDeptNode(root.id)}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>Loading departments...</p>
                )}
              </div>
            </div>

            {/* Department add/edit drawer panel */}
            <div className="auth-card" style={{ padding: '30px', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                {editingDept ? '✏️ Edit Department' : '➕ Add Department Node'}
              </h3>
              {isAdmin ? (
                <form onSubmit={handleSaveDept} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      required
                    />
                    <label className="form-label">Department / Team Name</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                      maxLength={6}
                      required
                    />
                    <label className="form-label">Code (e.g. ENG, HR, MKT)</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={deptForm.parentId}
                      onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })}
                    >
                      <option value="">None (Root Node)</option>
                      {departments.filter(d => d.id !== editingDept?.id && d.status === 'Active').map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                    <label className="form-label">Parent Department</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={deptForm.managerId}
                      onChange={(e) => setDeptForm({ ...deptForm, managerId: e.target.value })}
                    >
                      <option value="">-- Choose Manager --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <label className="form-label">Department Manager</label>
                  </div>

                  {editingDept && (
                    <div className="form-group form-select-container">
                      <select
                        className="form-control form-select"
                        value={deptForm.status}
                        onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Archived">Archived</option>
                      </select>
                      <label className="form-label">Status</label>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button type="submit" className="btn-primary" style={{ flexGrow: 1, margin: 0 }} disabled={loading}>
                      {loading ? 'Saving...' : editingDept ? 'Update Department' : 'Add Department'}
                    </button>
                    {editingDept && (
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => {
                          setEditingDept(null);
                          setDeptForm({ name: '', code: '', parentId: '', managerId: '', status: 'Active' });
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <Lock size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px' }}>Only workspace administrators can manage the organizational structures.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. DESIGNATIONS TAB */}
        {subTab === 'designations' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px' }}>
            <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                Corporate Designations Registry
              </h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '12px 8px' }}>Title</th>
                    <th style={{ padding: '12px 8px' }}>Department</th>
                    <th style={{ padding: '12px 8px' }}>Level</th>
                    <th style={{ padding: '12px 8px' }}>Employees</th>
                    {isAdmin && <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {designations.map(des => (
                    <tr key={des.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '600' }}>{des.title}</td>
                      <td style={{ padding: '12px 8px' }}>{des.department_name}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          {des.level}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{des.employee_count}</td>
                      {isAdmin && (
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <button 
                            onClick={() => {
                              setEditingDesig(des);
                              setDesigForm({ title: des.title, departmentId: des.department_id, level: des.level });
                              setShowAddDesig(true);
                            }}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '10px' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDesig(des.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="auth-card" style={{ padding: '30px', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                {editingDesig ? '✏️ Edit Designation' : '➕ Add Designation'}
              </h3>
              {isAdmin ? (
                <form onSubmit={handleSaveDesig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={desigForm.title}
                      onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                      required
                    />
                    <label className="form-label">Designation Title (e.g. Senior Software Architect)</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={desigForm.departmentId}
                      onChange={(e) => setDesigForm({ ...desigForm, departmentId: e.target.value })}
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.filter(d => d.status === 'Active').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <label className="form-label">Department Mapped</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={desigForm.level}
                      onChange={(e) => setDesigForm({ ...desigForm, level: e.target.value })}
                      required
                    >
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                    </select>
                    <label className="form-label">Experience Tier (Level)</label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ margin: '8px 0 0 0' }} disabled={loading}>
                    {loading ? 'Saving...' : editingDesig ? 'Update Designation' : 'Create Designation'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <Lock size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px' }}>Only admins can manage designations.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. OFFICE LOCATIONS TAB */}
        {subTab === 'locations' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px' }}>
            <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                Office Locations Registry
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {locations.map(loc => (
                  <div 
                    key={loc.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#1e293b' }}>
                        📍 {loc.name}
                      </h4>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b' }}>{loc.address}</p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                        <span>LAT: {loc.geo_lat}</span>
                        <span>LNG: {loc.geo_lng}</span>
                        <span style={{ color: '#2563eb' }}>RADIUS: {loc.geo_radius_meters}m</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setEditingLoc(loc);
                            setLocForm({ name: loc.name, address: loc.address, geoLat: loc.geo_lat, geoLng: loc.geo_lng, geoRadiusMeters: loc.geo_radius_meters });
                            setShowAddLoc(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                          onClick={() => handleDeleteLoc(loc.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="auth-card" style={{ padding: '30px', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                {editingLoc ? '✏️ Edit Location' : '➕ Add Office Location'}
              </h3>
              {isAdmin ? (
                <form onSubmit={handleSaveLoc} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={locForm.name}
                      onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                      required
                    />
                    <label className="form-label">Office Name (e.g. Headquarters)</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={locForm.address}
                      onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                      required
                    />
                    <label className="form-label">Postal Address</label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control"
                        placeholder=" "
                        value={locForm.geoLat}
                        onChange={(e) => setLocForm({ ...locForm, geoLat: parseFloat(e.target.value) })}
                        required
                      />
                      <label className="form-label">Latitude</label>
                    </div>

                    <div className="form-group">
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control"
                        placeholder=" "
                        value={locForm.geoLng}
                        onChange={(e) => setLocForm({ ...locForm, geoLng: parseFloat(e.target.value) })}
                        required
                      />
                      <label className="form-label">Longitude</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <input
                      type="number"
                      className="form-control"
                      placeholder=" "
                      value={locForm.geoRadiusMeters}
                      onChange={(e) => setLocForm({ ...locForm, geoRadiusMeters: parseInt(e.target.value) })}
                      required
                    />
                    <label className="form-label">Fence Radius (meters)</label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ margin: '8px 0 0 0' }} disabled={loading}>
                    {loading ? 'Saving...' : editingLoc ? 'Update Location' : 'Register Location'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <Lock size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px' }}>Only admins can manage geofenced locations.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. WORK SHIFTS TAB */}
        {subTab === 'shifts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px' }}>
            <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                Corporate Work Shifts
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {shifts.map(shift => (
                  <div 
                    key={shift.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⏰ {shift.name} 
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>
                          Dept: {shift.department_name}
                        </span>
                      </h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#334155', fontWeight: 'bold' }}>
                        {shift.start_time} - {shift.end_time}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                        LATE ARRIVAL GRACE: <span style={{ color: '#ef4444' }}>{shift.grace_period_minutes} min</span>
                      </p>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setEditingShift(shift);
                            setShiftForm({ name: shift.name, startTime: shift.start_time, endTime: shift.end_time, gracePeriodMinutes: shift.grace_period_minutes, organizationId: shift.organization_id });
                            setShowAddShift(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                          onClick={() => handleDeleteShift(shift.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="auth-card" style={{ padding: '30px', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                {editingShift ? '✏️ Edit Shift' : '➕ Add Shift Pattern'}
              </h3>
              {isAdmin ? (
                <form onSubmit={handleSaveShift} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={shiftForm.name}
                      onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                      required
                    />
                    <label className="form-label">Shift Label (e.g. Night Shift)</label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="HH:MM"
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                        required
                      />
                      <label className="form-label">Start Time</label>
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="HH:MM"
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                        required
                      />
                      <label className="form-label">End Time</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <input
                      type="number"
                      className="form-control"
                      placeholder=" "
                      value={shiftForm.gracePeriodMinutes}
                      onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMinutes: parseInt(e.target.value) })}
                      required
                    />
                    <label className="form-label">Grace Period (Minutes)</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={shiftForm.organizationId}
                      onChange={(e) => setShiftForm({ ...shiftForm, organizationId: e.target.value })}
                      required
                    >
                      <option value="">-- Mapped Department --</option>
                      {departments.filter(d => d.status === 'Active').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <label className="form-label">Department Mapped</label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ margin: '8px 0 0 0' }} disabled={loading}>
                    {loading ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <Lock size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px' }}>Only admins can manage shift templates.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. HOLIDAY CALENDAR TAB */}
        {subTab === 'holidays' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px' }}>
            <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
                  Holiday Calendar
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`btn-secondary ${holidayView === 'calendar' ? 'active-tab' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '12px', borderBottom: holidayView === 'calendar' ? '2px solid #2563eb' : 'none' }}
                    onClick={() => setHolidayView('calendar')}
                  >
                    Calendar view
                  </button>
                  <button 
                    className={`btn-secondary ${holidayView === 'list' ? 'active-tab' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '12px', borderBottom: holidayView === 'list' ? '2px solid #2563eb' : 'none' }}
                    onClick={() => setHolidayView('list')}
                  >
                    List view
                  </button>
                </div>
              </div>

              {holidayView === 'calendar' ? renderHolidayCalendar() : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '12px 8px' }}>Date</th>
                      <th style={{ padding: '12px 8px' }}>Name</th>
                      <th style={{ padding: '12px 8px' }}>Type</th>
                      {isAdmin && <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map(hol => (
                      <tr key={hol.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{hol.date}</td>
                        <td style={{ padding: '12px 8px' }}>{hol.name}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: '11px', background: hol.type === 'National' ? '#fee2e2' : '#fef3c7', color: hol.type === 'National' ? '#ef4444' : '#d97706', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {hol.type}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleDeleteHoliday(hol.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="auth-card" style={{ padding: '30px', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
                ➕ Configure Holiday
              </h3>
              {isAdmin ? (
                <form onSubmit={handleSaveHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <input
                      type="date"
                      className="form-control"
                      placeholder=" "
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                      required
                    />
                    <label className="form-label">Holiday Date</label>
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder=" "
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      required
                    />
                    <label className="form-label">Holiday Label (e.g. Thanksgiving)</label>
                  </div>

                  <div className="form-group form-select-container">
                    <select
                      className="form-control form-select"
                      value={holidayForm.type}
                      onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                      required
                    >
                      <option value="National">National</option>
                      <option value="Regional">Regional</option>
                      <option value="Optional">Optional</option>
                    </select>
                    <label className="form-label">Holiday Category</label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ margin: '8px 0 0 0' }} disabled={loading}>
                    {loading ? 'Adding...' : 'Add to Calendar'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <Lock size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px' }}>Only admins can configure holidays.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. REPORTING LINES TAB */}
        {subTab === 'reporting' && (
          <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>
              People Reporting Hierarchy
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Reporting structures based on employees' reporting managers.
            </p>

            <div className="tree-container" style={{ background: '#fdfdfd', border: '1px solid rgba(74, 46, 42, 0.08)', borderRadius: '12px', padding: '24px', minHeight: '300px' }}>
              {/* Renders root nodes (employees who report to users who are Super Admin, i.e., ID = 1 or report to null) */}
              {employees.length > 0 ? (
                (() => {
                  const roots = employees.filter(e => e.reporting_manager_id === null || e.reporting_manager_id === 1);
                  if (roots.length === 0) return <p style={{ color: '#64748b', fontStyle: 'italic' }}>No reporting hierarchies found.</p>;

                  return roots.map(root => (
                    <div key={root.id} style={{ marginBottom: '24px' }}>
                      <div 
                        className="tree-node-content"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          background: '#eff6ff',
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe'
                        }}
                      >
                        <Crown size={16} style={{ color: '#eab308' }} />
                        <strong>{root.name}</strong> 
                        <span style={{ fontSize: '12px', color: '#64748b' }}>({root.designation_title || 'Chief Officer'})</span>
                      </div>
                      {renderReportingNode(root.user_id)}
                    </div>
                  ));
                })()
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>Loading reporting lines...</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrganizationsTab;
