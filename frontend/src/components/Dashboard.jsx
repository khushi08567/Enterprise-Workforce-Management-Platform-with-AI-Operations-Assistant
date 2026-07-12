import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Crown, 
  LayoutDashboard, 
  ClipboardList, 
  Bell, 
  Moon, 
  Sun, 
  MessageCircle, 
  Lock, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Search,
  Shield,
  Trash2,
  Users,
  TrendingUp,
  Briefcase,
  Clock,
  Calendar,
  DollarSign,
  Award,
  BarChart,
  Folder,
  Monitor,
  MessageSquare,
  FileText,
  Bot,
  X,
  Mic,
  Sparkles,
  Check,
  Play,
  AlertCircle,
  Brain,
  Home,
  Gamepad2,
  Mail,
  LogOut,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import OrganizationsTab from './org/OrganizationsTab';
import EmployeesTab from './emp/EmployeesTab';
import InsightsTab from './insights/InsightsTab';
import RecruitmentTab from './recruitment/RecruitmentTab';
import AttendanceTab from './attendance/AttendanceTab';
import LeaveTab from './leave/LeaveTab';
import PayrollTab from './payroll/PayrollTab';
import PerformanceTab from './performance/PerformanceTab';
import ProjectsTab from './project/ProjectsTab';
import AssetsTab from './asset/AssetsTab';
import TicketsTab from './ticket/TicketsTab';
import DocumentsTab from './document/DocumentsTab';
import NotificationsCenter from './notification/NotificationsCenter';
import ReportsTab from './report/ReportsTab';
import AIAssistantWidget from './ai/AIAssistantWidget';
import logoImg from '../assets/logo.png';
import AgentQueueTab from './agent/AgentQueueTab';
import SkillsMarketplaceTab from './skill/SkillsMarketplaceTab';
import WorkforceSimulatorTab from './analytics/WorkforceSimulatorTab';
import HybridWorkHubTab from './hybrid/HybridWorkHubTab';
import GamificationTab from './gamification/GamificationTab';
import ScenarioOrgChartTab from './org/ScenarioOrgChartTab';

const ALL_PERMISSIONS_MAPPING = {
  '*:*': 'Full Administrator Privileges (All actions)',
  '*:read': 'Auditor Read-Only Access (All modules)',
  'org:read': 'View Corporate Directory',
  'org:write': 'Manage Organization Structure',
  'department:write': 'Manage Departments Structure',
  'role:manage': 'Create & Edit Workspace Roles',
  'invite:generate': 'Generate invite codes',
  'employee:crud': 'Full CRUD Employees Directory',
  'employee:read': 'View Employees List',
  'employee:self': 'Manage Self Employee Record',
  'recruitment:crud': 'Manage Recruitment Pipeline',
  'attendance:crud': 'Manage All Attendance Records',
  'attendance:mark': 'Mark Self Attendance',
  'attendance:approve': 'Approve Team Attendance Corrections',
  'leave:crud': 'Manage All Leave Logs',
  'leave:apply': 'Apply for Leaves',
  'leave:approve': 'Approve/Reject Team Leaves',
  'payroll:crud': 'Manage Salaries & Payroll',
  'payroll:read': 'View Employee Payroll details',
  'reports:payroll': 'Generate Payroll Reports',
  'reports:department': 'Generate Department Reports',
  'asset:crud': 'Manage Company Assets',
  'helpdesk:crud': 'Manage IT Support Tickets',
  'helpdesk:raise': 'File support/helpdesk tickets',
  'user:unblock': 'Unlock Blocked Accounts',
  'password:reset': 'Force Reset User Passwords',
  'project:crud': 'Manage Team Projects',
  'task:assign': 'Assign Tasks to Coworkers',
  'task:self': 'Manage Self Assigned Tasks'
};

const PERMISSION_OPTIONS = [
  '*:*', '*:read',
  'org:read', 'org:write', 'department:write', 'role:manage', 'invite:generate',
  'employee:crud', 'employee:read', 'employee:self',
  'recruitment:crud',
  'attendance:crud', 'attendance:mark', 'attendance:approve',
  'leave:crud', 'leave:apply', 'leave:approve',
  'payroll:crud', 'payroll:read',
  'reports:payroll', 'reports:department',
  'asset:crud', 'helpdesk:crud', 'helpdesk:raise',
  'user:unblock', 'password:reset',
  'project:crud', 'task:assign', 'task:self'
];

const roleHierarchyData = {
  name: 'Super Admin',
  level: 100,
  roleName: 'Super Admin',
  children: [
    {
      name: 'Organization Admin',
      level: 90,
      roleName: 'Organization Admin',
      children: [
        {
          name: 'HR Manager',
          level: 70,
          roleName: 'HR Manager',
          children: [
            {
              name: 'Department Manager',
              level: 60,
              roleName: 'Department Manager',
              children: [
                {
                  name: 'Team Lead',
                  level: 40,
                  roleName: 'Team Lead',
                  children: [
                    { name: 'Employee', level: 20, roleName: 'Employee', children: [] },
                    { name: 'Intern', level: 10, roleName: 'Intern', children: [] }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Finance Executive',
          level: 70,
          roleName: 'Finance Executive',
          children: [
            { name: 'Employee', level: 20, roleName: 'Employee', children: [] }
          ]
        },
        {
          name: 'IT Administrator',
          level: 70,
          roleName: 'IT Administrator',
          children: [
            { name: 'Employee', level: 20, roleName: 'Employee', children: [] }
          ]
        }
      ]
    }
  ]
};

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'organizations', 'roles', 'delegations', 'emailLogs'
  const [rolesSubTab, setRolesSubTab] = useState('directory');
  const [organizations, setOrganizations] = useState([]);
  const [invites, setInvites] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Collapsible sidebar sections state
  const [expandedSections, setExpandedSections] = useState(() => {
    const core = localStorage.getItem('sidebar_section_core_expanded');
    const admin = localStorage.getItem('sidebar_section_admin_expanded');
    return {
      core: core !== null ? core === 'true' : true,
      admin: admin !== null ? admin === 'true' : false
    };
  });

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const nextVal = !prev[sectionId];
      localStorage.setItem(`sidebar_section_${sectionId}_expanded`, String(nextVal));
      return { ...prev, [sectionId]: nextVal };
    });
  };

  const sidebarSections = [
    {
      id: 'core',
      label: 'Core',
      items: [
        { id: 'organizations', label: 'Organization Management', icon: Building2 },
        { id: 'employees', label: 'Employees Directory', icon: Users },
        { id: 'recruitment', label: 'Recruitment Board', icon: Briefcase },
        { id: 'attendance', label: 'Attendance Clock', icon: Clock },
        { id: 'leave', label: 'Leave Management', icon: Calendar },
        { id: 'payroll', label: 'Payroll Remuneration', icon: DollarSign },
        { id: 'performance', label: 'Performance Targets', icon: Award },
        { id: 'projects', label: 'Project Tasks', icon: Folder },
        { id: 'assets', label: 'Asset Inventory', icon: Monitor },
        { id: 'tickets', label: 'Help Desk Tickets', icon: MessageSquare },
        { id: 'documents', label: 'Policy Documents', icon: FileText },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart }
      ]
    },
    {
      id: 'admin',
      label: 'Admin / Compliance',
      items: [
        { id: 'roles', label: 'Role Manager', icon: Shield, requiredRoles: ['Super Admin'], requiredPermissions: ['role:manage'] },
        { id: 'delegations', label: 'Temporary Delegations', icon: ClipboardList },
        { id: 'auditLogs', label: 'Audit Log Compliance', icon: Shield, requiredRoles: ['Super Admin', 'Organization Admin', 'Auditor'] },
        { id: 'insights', label: 'Workforce Insights', icon: TrendingUp, disabled: true },
        { id: 'emailLogs', label: 'Email Simulator', icon: Mail, requiredRoles: ['Super Admin', 'Organization Admin'] }
      ]
    }
  ];

  // Day 3 & Day 4 Feature States
  const [delegations, setDelegations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [delegateToId, setDelegateToId] = useState('');
  const [delegateRole, setDelegateRole] = useState('Employee');
  const [delegateStartDate, setDelegateStartDate] = useState('');
  const [delegateEndDate, setDelegateEndDate] = useState('');

  // Floating AI Assistant States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiEmployeeDeptFilter, setAiEmployeeDeptFilter] = useState('');

  // Command Center Overview States
  const [nudges, setNudges] = useState([
    { id: 1, type: "urgent", message: "🔥 Task #442 deadline is tomorrow at 12:00 PM", action: "Review" },
    { id: 2, type: "info", message: "🌟 You've worked 4 hours straight! Take a quick screen break.", action: "Snooze" },
    { id: 3, type: "alert", message: "⚡ Weekly payroll draft is awaiting your approval", action: "View" }
  ]);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState(null);
  const [newHiresCount, setNewHiresCount] = useState(3);
  const [salaryRaisePct, setSalaryRaisePct] = useState(5);
  const [kudosMsg, setKudosMsg] = useState('');
  const [kudosTo, setKudosTo] = useState('Rahul');
  const [kudosPoints, setKudosPoints] = useState(50);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: "Hello! I am your AI Operations Assistant. Ask me anything about users, roles, departments, or delegations!" }
  ]);
  
  // Form States (Organizations & Invites)
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgParentId, setNewOrgParentId] = useState('');
  const [inviteRole, setInviteRole] = useState('Employee');
  const [inviteOrg, setInviteOrg] = useState('Engineering');

  // Employee creation form states
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empOrg, setEmpOrg] = useState('Engineering');
  const [empRole, setEmpRole] = useState('Employee');

  // Custom Role Builder Form States
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(10);
  const [newRolePerms, setNewRolePerms] = useState(['org:read']);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleLevel, setEditRoleLevel] = useState(10);
  const [editRolePerms, setEditRolePerms] = useState([]);

  // Org Tree Enhancements States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // Advanced Demo Features States
  const [impersonatedRole, setImpersonatedRole] = useState(null);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdResults, setCmdResults] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Welcome to your Syncra Assistant.', read: false, time: 'Just now' },
    { id: 2, text: 'Holiday calendar has been updated.', read: true, time: '1 hour ago' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [prefilledOnboarding, setPrefilledOnboarding] = useState(null);

  const handlePrefillOnboarding = (candidateData) => {
    setPrefilledOnboarding(candidateData);
    setActiveTab('employees');
  };

  const activeUserRole = impersonatedRole || user.role;
  const activeUser = { ...user, role: activeUserRole };

  // 1. Dark Mode DOM side-effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 2. HTTP Interceptor for Impersonated Role Header injection
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (url, options = {}) => {
      if (impersonatedRole) {
        options.headers = {
          ...options.headers,
          'X-Impersonate-Role': impersonatedRole
        };
      }
      return originalFetch(url, options);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [impersonatedRole]);

  // 3. Command Palette Keyboard Shortcut Listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 4. Simulated Real-Time System Notification dispatcher
  useEffect(() => {
    const interval = setInterval(() => {
      const alertLogs = [
        'Onboarding credentials dispatched for Jane Developer.',
        'High attrition risk score detected for Employee EMP1002.',
        'Simulated separation exit checklist completed by HR.',
        'Audit logs requested by administrator user.'
      ];
      const text = alertLogs[Math.floor(Math.random() * alertLogs.length)];
      setNotifications(prev => [
        { id: Date.now(), text, read: false, time: 'Just now' },
        ...prev
      ]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCmdSearch = (val) => {
    setCmdQuery(val);
    if (!val.trim()) {
      setCmdResults([]);
      return;
    }
    const commands = [
      { label: 'Go to Overview Dashboard', tab: 'overview' },
      { label: 'Go to Organization Management', tab: 'organizations' },
      { label: 'Go to Onboarding Invites', tab: 'invites' },
      { label: 'Go to System Access Roles', tab: 'roles' },
      { label: 'Go to Temporary Delegations', tab: 'delegations' },
      { label: 'Go to Simulated Email Logs', tab: 'emailLogs' },
      { label: 'Go to Employees Directory', tab: 'employees' },
      { label: 'Go to Workforce Analytics Insights', tab: 'insights' },
      { label: 'Go to Audit Compliance log', tab: 'auditLogs' },
      { label: 'Go to Recruitment Candidate Board', tab: 'recruitment' },
      { label: 'Go to Attendance Clock In/Out', tab: 'attendance' },
      { label: 'Go to Leave Balance & Apply Requests', tab: 'leave' },
      { label: 'Go to Payroll Payslip Statements', tab: 'payroll' },
      { label: 'Go to Performance Quarters Goals', tab: 'performance' }
    ];
    setCmdResults(commands.filter(c => c.label.toLowerCase().includes(val.toLowerCase())));
  };

  // Initialize expansion state and default selected node
  useEffect(() => {
    if (organizations.length > 0) {
      const initialExpanded = {};
      const exceedsLimit = organizations.length > 10;
      organizations.forEach(org => {
        if (org.parent_id === null) {
          initialExpanded[org.id] = true;
          if (!selectedNodeId) {
            setSelectedNodeId(org.id);
          }
        } else {
          initialExpanded[org.id] = !exceedsLimit;
        }
      });
      setExpandedNodes(initialExpanded);
    }
  }, [organizations]);

  // Live filter matching logic: get all node IDs that match or are ancestors of matches
  const getFilteredOrgIds = () => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const matchedIds = new Set();
    organizations.forEach(org => {
      if (org.name.toLowerCase().includes(term)) {
        matchedIds.add(org.id);
      }
    });

    const visibleIds = new Set(matchedIds);
    const addAncestors = (orgId) => {
      const org = organizations.find(o => o.id === orgId);
      if (org && org.parent_id !== null) {
        visibleIds.add(org.parent_id);
        addAncestors(org.parent_id);
      }
    };
    matchedIds.forEach(id => addAncestors(id));
    return visibleIds;
  };

  // Expand matching paths when search term changes
  useEffect(() => {
    if (searchTerm.trim() && organizations.length > 0) {
      const visibleIds = getFilteredOrgIds();
      if (visibleIds) {
        const newExpanded = {};
        visibleIds.forEach(id => {
          newExpanded[id] = true;
        });
        setExpandedNodes(prev => ({ ...prev, ...newExpanded }));
      }
    }
  }, [searchTerm]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleCopyID = (nodeId) => {
    navigator.clipboard.writeText(nodeId.toString());
  };

  const getBreadcrumbs = () => {
    if (!selectedNodeId) return [];
    const path = [];
    let currentId = selectedNodeId;
    while (currentId !== null) {
      const org = organizations.find(o => o.id === currentId);
      if (!org) break;
      path.unshift(org);
      currentId = org.parent_id;
    }
    return path;
  };

  // Fetch initial data
  useEffect(() => {
    fetchOrganizations();
    fetchRoles();
    fetchDelegations();
    fetchUsers();
    if (user.role === 'Admin' || user.role === 'Super Admin' || user.permissions?.includes('invite:generate')) {
      fetchInvites();
      fetchBlockedUsers();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'emailLogs') {
      fetchEmailLogs();
    }
  }, [activeTab]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/organizations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
        if (data.organizations && data.organizations.length > 0 && !inviteOrg) {
          setInviteOrg(data.organizations[0].name);
        }
        if (data.organizations && data.organizations.length > 0 && !empOrg) {
          setEmpOrg(data.organizations[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/invites', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/blocked', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/roles', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchDelegations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/role-delegation-policies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDelegations(data.delegations || []);
      }
    } catch (err) {
      console.error('Error fetching delegations:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/role-assignment-policies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users || []);
        if (data.users && data.users.length > 0 && !delegateToId) {
          setDelegateToId(data.users[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/email/logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching email logs:', err);
    }
  };

  const handleDelegateSubmit = async (e) => {
    e.preventDefault();
    if (!delegateToId || !delegateRole || !delegateStartDate || !delegateEndDate) {
      setMessage({ type: 'error', text: 'All fields are required for temporary delegation.' });
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/v1/role-delegation-policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({
          delegateToId: parseInt(delegateToId),
          roleName: delegateRole,
          startDate: delegateStartDate,
          endDate: delegateEndDate
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchDelegations();
        setDelegateStartDate('');
        setDelegateEndDate('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delegate role.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  const handleRevokeDelegation = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/role-delegation-policies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchDelegations();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to revoke delegation.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  const handleClearEmailLogs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/email/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (response.ok) {
        setEmailLogs([]);
        setMessage({ type: 'success', text: 'Simulated email logs cleared.' });
      }
    } catch (err) {
      console.error('Error clearing email logs:', err);
    }
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMessage = { role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMessage]);
    const currentInput = aiInput;
    setAiInput('');
    setIsAiTyping(true);

    try {
      const response = await fetch('http://localhost:5000/api/v1/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({ query: currentInput, activeTab })
      });
      const data = await response.json();
      setIsAiTyping(false);
      if (response.ok) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Failed to process AI query.'}` }]);
      }
    } catch (err) {
      setIsAiTyping(false);
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Failed to contact AI service. Please verify server status.' }]);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/v1/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          level: newRoleLevel,
          permissions: newRolePerms
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create role.');

      setMessage({ type: 'success', text: `Role "${newRoleName}" created successfully.` });
      setNewRoleName('');
      setNewRoleLevel(10);
      setNewRolePerms(['org:read']);
      fetchRoles();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editRoleName.trim() || !editingRoleId) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`http://localhost:5000/api/v1/roles/${editingRoleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({
          name: editRoleName.trim(),
          level: editRoleLevel,
          permissions: editRolePerms
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update role.');

      setMessage({ type: 'success', text: 'Workspace role updated successfully.' });
      setEditingRoleId(null);
      setEditRoleName('');
      fetchRoles();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`http://localhost:5000/api/v1/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete role.');

      setMessage({ type: 'success', text: data.message });
      fetchRoles();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (userId) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to unblock user account.');

      setMessage({ type: 'success', text: data.message });
      fetchBlockedUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectRegisterEmployee = async (e) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empPassword.trim() || !empOrg || !empRole) {
      setMessage({ type: 'error', text: 'All direct employee fields are required.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: empName.trim(),
          email: empEmail.trim().toLowerCase(),
          password: empPassword.trim(),
          role: empRole,
          organization: empOrg
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register employee.');

      setMessage({ type: 'success', text: `Employee account for "${empName}" created successfully.` });
      setEmpName('');
      setEmpEmail('');
      setEmpPassword('');
      setEmpRole('Employee');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/v1/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({
          name: newOrgName.trim(),
          parentId: newOrgParentId || null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create organization unit.');

      setMessage({ type: 'success', text: `Department "${newOrgName}" added successfully.` });
      setNewOrgName('');
      setNewOrgParentId('');
      fetchOrganizations();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/v1/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wfm_token')}`
        },
        body: JSON.stringify({
          role: inviteRole,
          organization: inviteOrg
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate invite code.');

      setMessage({ type: 'success', text: 'New onboarding invite code generated.' });
      fetchInvites();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Copied invite code: ${code}`);
  };

  // Recursive Tree Rendering
  const renderOrgTree = (parentId) => {
    const visibleIds = getFilteredOrgIds();
    const allChildren = organizations.filter(org => org.parent_id === parentId);
    
    // Filter matching branches when searching
    const children = visibleIds 
      ? allChildren.filter(org => visibleIds.has(org.id))
      : allChildren;

    if (children.length === 0) return null;

    return (
      <div 
        className="tree-branch-container" 
        style={{ display: expandedNodes[parentId] ? 'block' : 'none' }}
      >
        {children.map(child => {
          const hasChildren = organizations.some(org => org.parent_id === child.id);
          const isExpanded = !!expandedNodes[child.id];
          const isSelected = selectedNodeId === child.id;
          
          return (
            <div key={child.id} className="tree-node-wrapper tree-child-node">
              <div 
                className="tree-node-card-row" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  margin: '6px 0',
                  position: 'relative'
                }}
              >
                {/* Expand/Collapse Chevron toggle */}
                {hasChildren ? (
                  <button 
                    type="button"
                    onClick={() => toggleNode(child.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#64748b',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      borderRadius: '4px'
                    }}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                ) : (
                  <div style={{ width: '24px' }} /> // spacer matching chevron padding + icon size
                )}
                
                {/* Node card */}
                <div 
                  className="tree-node-content" 
                  onClick={() => setSelectedNodeId(child.id)}
                  style={{ 
                    cursor: 'pointer',
                    borderColor: isSelected ? '#2563eb' : 'rgba(74, 46, 42, 0.08)',
                    boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : 'var(--shadow-sm)',
                    background: isSelected ? '#f8fafc' : '#ffffff',
                    transition: 'all 0.15s'
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedNodeId(child.id); }}
                >
                  <Building2 size={20} strokeWidth={1.75} style={{ color: isSelected ? '#2563eb' : '#64748b' }} />
                  <span className="node-name" style={{ color: isSelected ? '#0f172a' : 'inherit' }}>{child.name}</span>
                  
                  {/* Hover copy ID button */}
                  <div className="node-id-hover-container">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent selecting node when copying ID
                        handleCopyID(child.id);
                      }}
                      className="copy-id-btn"
                    >
                      <Copy size={12} strokeWidth={1.75} />
                      <span className="tooltip-text">Copy ID: {child.id}</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Recursively render children */}
              {hasChildren && renderOrgTree(child.id)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRoleHierarchyNode = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    const realRole = roles.find(r => r.name === node.roleName) || { permissions: [] };
    
    return (
      <div key={node.name} className="tree-node-wrapper tree-child-node" style={{ paddingLeft: '20px', borderLeft: '1px dashed #cbd5e1', marginLeft: '10px', position: 'relative' }}>
        <div 
          className="tree-node-card-row" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            margin: '8px 0',
            position: 'relative'
          }}
        >
          <div 
            className="tree-node-content" 
            style={{ 
              borderColor: 'rgba(74, 46, 42, 0.08)',
              boxShadow: 'var(--shadow-sm)',
              background: '#ffffff',
              padding: '12px 18px',
              borderRadius: '12px',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              minWidth: '220px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <strong style={{ fontSize: '14px', color: '#1e293b' }}>{node.name}</strong>
              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: 'auto' }}>
                Lvl {node.level}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
              {realRole.permissions.length === 0 && (
                <span style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}>No active privileges</span>
              )}
              {realRole.permissions.slice(0, 3).map(p => (
                <span key={p} style={{ fontSize: '9px', background: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                  {p}
                </span>
              ))}
              {realRole.permissions.length > 3 && (
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '500' }}>
                  +{realRole.permissions.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
        
        {hasChildren && (
          <div className="tree-branch-container" style={{ display: 'block' }}>
            {node.children.map(child => renderRoleHierarchyNode(child))}
          </div>
        )}
      </div>
    );
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'Super Admin':
        return <span className="user-badge badge-super-admin">Super Admin</span>;
      case 'Admin':
        return <span className="user-badge badge-admin">Admin</span>;
      default:
        return <span className="user-badge badge-employee">Employee</span>;
    }
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'var(--dashboard-bg)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }}>
      {/* Toast message alert */}
      {message && (
        <div className={`toast-msg toast-${message.type}`} style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <span>{message.type === 'success' ? '✓' : '⚠'}</span>
          <span>{message.text}</span>
          <button className="toast-close" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Left Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '30px 20px',
        flexShrink: 0
      }}>
        <div>
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
            <img 
              src={logoImg} 
              alt="Syncra logo" 
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                borderRadius: '6px',
                background: 'transparent'
              }} 
            />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              color: 'var(--header-title-color)'
            }}>
              SYNCRA ENTERPRISE
            </span>
          </div>

          {/* Nav list */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
            <button
              onClick={() => { setActiveTab('overview'); setMessage(null); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'overview' ? '#eff6ff' : 'transparent',
                color: activeTab === 'overview' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === 'overview' ? '600' : '500',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14.5px',
                transition: 'all 0.15s'
              }}
            >
              <LayoutDashboard size={20} strokeWidth={1.75} /> My Dashboard
            </button>

            {sidebarSections.map(sec => {
              // 1. Filter section items against role/permissions
              const visibleItems = sec.items.filter(item => {
                if (item.requiredRoles) {
                  if (!item.requiredRoles.includes(user.role)) return false;
                }
                if (item.requiredPermissions) {
                  if (user.role !== 'Super Admin' && !item.requiredPermissions.some(p => user.permissions?.includes(p))) {
                    return false;
                  }
                }
                return true;
              });

              // 2. Hide section if no items are visible
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedSections[sec.id];

              return (
                <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Collapsible Section Header */}
                  <button
                    role="button"
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-list-${sec.id}`}
                    onClick={() => toggleSection(sec.id)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#475569',
                      fontWeight: '600',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.75px',
                      transition: 'all 0.15s',
                      outline: 'none',
                      userSelect: 'none'
                    }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #3b82f6'}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleSection(sec.id);
                      }
                    }}
                  >
                    <span>{sec.label}</span>
                    <ChevronDown 
                      size={14} 
                      style={{ 
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.2s ease',
                        color: '#64748b' 
                      }} 
                    />
                  </button>

                  {/* Collapsible Section Items list via Framer Motion */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        id={`sidebar-list-${sec.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }}
                      >
                        {visibleItems.map(item => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;

                          if (item.disabled) {
                            return (
                              <div
                                key={item.id}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  borderRadius: '8px',
                                  color: '#cbd5e1',
                                  fontWeight: '500',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  fontSize: '14.5px',
                                  cursor: 'not-allowed',
                                  userSelect: 'none'
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <Icon size={18} strokeWidth={1.75} style={{ color: '#cbd5e1' }} />
                                  {item.label}
                                </span>
                                <span style={{ fontSize: '9px', background: '#f1f5f9', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                  soon
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={item.id}
                              onClick={() => { setActiveTab(item.id); setMessage(null); }}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                                color: isActive ? '#2563eb' : '#64748b',
                                fontWeight: isActive ? '600' : '500',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontSize: '14.5px',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Icon size={18} strokeWidth={1.75} /> {item.label}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Right Main viewport */}
      <main style={{
        flexGrow: 1,
        padding: '40px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        {/* Top Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--sidebar-border)',
          paddingBottom: '20px'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--header-title-color)',
            textTransform: 'capitalize'
          }}>
            {activeTab === 'overview' ? 'Dashboard' : activeTab.replace(/([A-Z])/g, ' $1')}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Group notification bell + user identity pill together */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              
              {/* Notification Center */}
              <NotificationsCenter user={activeUser} />

              {/* Impersonator selector (Admins only) */}
              {(user.role === 'Super Admin' || user.role === 'Admin') && (
                <select
                  value={impersonatedRole || user.role}
                  onChange={(e) => setImpersonatedRole(e.target.value === user.role ? null : e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--sidebar-border)',
                    fontSize: '12px',
                    background: 'var(--menu-active-bg)',
                    color: 'var(--menu-active-color)',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <option value={user.role}>Role: {user.role} (Original)</option>
                  <option value="Employee">Impersonate: Employee</option>
                  <option value="HR">Impersonate: HR</option>
                  <option value="Finance">Impersonate: Finance</option>
                  <option value="Admin">Impersonate: Admin</option>
                </select>
              )}

              {/* Profile dropdown container */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--sidebar-border)',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #3b82f6'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '11px'
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  Welcome, {user.name} ({activeUserRole})
                  <ChevronDown size={14} style={{ transform: isProfileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <>
                      {/* Backdrop for click outside */}
                      <div 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          width: '240px',
                          backgroundColor: 'var(--sidebar-bg)',
                          border: '1px solid var(--sidebar-border)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          zIndex: 1000
                        }}
                      >
                        {/* Profile Info Header */}
                        <div>
                          <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-dark)' }}>{user.name}</strong>
                          <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>{user.email}</span>
                          <span style={{ 
                            display: 'inline-block', 
                            marginTop: '8px', 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            color: 'var(--menu-active-color)', 
                            backgroundColor: 'var(--menu-active-bg)', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            border: '1px solid var(--sidebar-border)'
                          }}>
                            {activeUserRole}
                          </span>
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--sidebar-border)' }} />

                        {/* Menu options */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            alert(`User Profile Details:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${activeUserRole}\nOrganization: ${user.organization || 'Main Corporate'}`);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: '500',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-item-bg)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          👤 View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onLogout();
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            fontSize: '13px',
                            fontWeight: '600',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <LogOut size={14} /> Log Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Vertical separator */}
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--sidebar-border)' }} />

            {/* Far right Theme toggle */}
            <button 
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                padding: '6px',
                borderRadius: '6px',
                transition: 'background-color 0.15s'
              }}
              title="Toggle Theme"
              onClick={() => setIsDarkMode(!isDarkMode)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-border)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isDarkMode ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {/* 1. OVERVIEW TAB: SaaS Product Dashboard Grid */}
        {activeTab === 'overview' && (() => {
          const hr = new Date().getHours();
          const getDashboardContext = () => {
            if (hr >= 5 && hr < 12) return { name: "Morning Launch", desc: "Clock-in, morning tasks, and task highlights", timeOfDay: "morning" };
            if (hr >= 12 && hr < 15) return { name: "Midday Sync", desc: "Pending approvals, lunch reminders, and team presence", timeOfDay: "midday" };
            if (hr >= 15 && hr < 18) return { name: "Afternoon Focus", desc: "Deadline warnings, focus state, and overtime tracking", timeOfDay: "afternoon" };
            return { name: "Evening Wrap", desc: "Tomorrow's outlook, clock-out checks, and today's summary", timeOfDay: "evening" };
          };
          const context = getDashboardContext();

          // Budget Simulator Calculations
          const basePayroll = 1.15; // in Crores
          const calculatedPayroll = (basePayroll + (newHiresCount * 0.15) + (basePayroll * (salaryRaisePct / 100))).toFixed(2);

          const handleSendKudos = (e) => {
            e.preventDefault();
            if (!kudosMsg.trim()) return;
            setMessage({ type: 'success', text: `Sent ${kudosPoints} Kudos points to ${kudosTo}!` });
            setKudosMsg('');
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="fade-in">
              
              {/* 5.4 Nudge Ticker */}
              {nudges.length > 0 && (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  borderLeft: '4px solid #6366F1',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }} className="glass-card">
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="nudge-marquee">
                      {nudges.map(n => (
                        <span key={n.id} style={{ marginRight: '40px', fontSize: '13px', color: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: n.type === 'urgent' ? '#EF4444' : '#F59E0B'
                          }} />
                          {n.message}
                          <button onClick={() => {
                            if (n.action === 'Review') setActiveTab('projects');
                            if (n.action === 'View') setActiveTab('payroll');
                          }} style={{ color: '#8b5cf6', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', textDecoration: 'underline' }}>
                            [{n.action}]
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setNudges([])} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', marginLeft: '12px' }}>×</button>
                </div>
              )}

              {/* Greeting & Time-Aware Context banner */}
              <div className="glass-card" style={{
                borderRadius: '16px',
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ⚡ {context.name} Context Active
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginTop: '6px', marginBottom: '4px' }}>
                    Welcome back, {user.name}
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0 }}>
                    {context.desc}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Role Profile: <span style={{ color: '#10B981', fontWeight: 'bold' }}>{activeUserRole}</span>
                  </div>
                </div>
              </div>

              {/* BENTO GRID ROOT */}
              {/* 4.1 ROLE-SPECIFIC RENDERERS */}
              
              {/* ROLE A: EMPLOYEE VIEW ("My Mission Control") */}
              {activeUserRole === 'Employee' && (
                <div className="bento-grid">
                  
                  {/* Today Attendance Ring Card */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600', alignSelf: 'flex-start' }}>TODAY'S SHIFT</h3>
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#334155" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke={clockedIn ? "#10B981" : "#F59E0B"} strokeWidth="10"
                          strokeDasharray="314.15" strokeDashoffset={clockedIn ? "78.5" : "235"} strokeLinecap="round" />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>{clockedIn ? '85%' : '0%'}</span>
                        <span style={{ fontSize: '9px', display: 'block', color: '#94a3b8' }}>Shift Complete</span>
                      </div>
                    </div>
                    <button onClick={() => {
                      setClockedIn(!clockedIn);
                      setClockTime(new Date().toLocaleTimeString());
                      setMessage({ type: 'success', text: clockedIn ? 'Clocked out successfully!' : 'Clocked in successfully!' });
                    }} className="btn-primary" style={{ width: '100%', padding: '10px' }}>
                      {clockedIn ? `Clock Out (${clockTime || '09:00'})` : 'Clock In Now'}
                    </button>
                  </div>

                  {/* Quick Actions Card */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>QUICK NAVIGATION</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                      <button onClick={() => setActiveTab('leave')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', borderRadius: '12px', cursor: 'pointer', padding: '12px', fontSize: '13px' }}>
                        📅 Leave Apply
                      </button>
                      <button onClick={() => setActiveTab('payroll')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', borderRadius: '12px', cursor: 'pointer', padding: '12px', fontSize: '13px' }}>
                        💰 Payslip
                      </button>
                      <button onClick={() => setActiveTab('tickets')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', borderRadius: '12px', cursor: 'pointer', padding: '12px', fontSize: '13px' }}>
                        🛠 Support
                      </button>
                      <button onClick={() => setActiveTab('documents')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', borderRadius: '12px', cursor: 'pointer', padding: '12px', fontSize: '13px' }}>
                        📂 Docs Repo
                      </button>
                    </div>
                  </div>

                  {/* XP & Level Progress Ring */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>GAMIFICATION MILESTONES</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                        <svg width="70" height="70" viewBox="0 0 70 70">
                          <circle cx="35" cy="35" r="28" fill="transparent" stroke="#334155" strokeWidth="6" />
                          <circle cx="35" cy="35" r="28" fill="transparent" stroke="#8b5cf6" strokeWidth="6"
                            strokeDasharray="175.92" strokeDashoffset="52.77" strokeLinecap="round" />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', color: 'white', fontSize: '14px' }}>
                          Lvl 7
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 'bold' }}>3,450 / 5,000 XP</div>
                        <div style={{ height: '6px', background: '#334155', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                          <div style={{ width: '69%', height: '100%', background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                          <span title="Perfect Attendance" style={{ fontSize: '14px' }}>🏆</span>
                          <span title="Speedy Approver" style={{ fontSize: '14px' }}>🔥</span>
                          <span title="Task Master" style={{ fontSize: '14px' }}>⭐</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kanban Mini Overview */}
                  <div className="glass-card" style={{ gridColumn: 'span 8', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>MY TASKS PIPELINE SUMMARY</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>TO DO</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>3</div>
                      </div>
                      <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                        <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold' }}>IN PROGRESS</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#818cf8', marginTop: '4px' }}>2</div>
                      </div>
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                        <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold' }}>REVIEW</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', marginTop: '4px' }}>1</div>
                      </div>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 'bold' }}>COMPLETED</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399', marginTop: '4px' }}>8</div>
                      </div>
                    </div>
                  </div>

                  {/* Team Presence avatars list */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>TEAM PRESENCE</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#f8fafc' }}>🟢 Amit Pathak</span>
                        <span style={{ fontSize: '10px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Online</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#f8fafc' }}>🟡 Neha Mehta</span>
                        <span style={{ fontSize: '10px', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Away</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#f8fafc' }}>🏢 Priya Sharma</span>
                        <span style={{ fontSize: '10px', color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>In Office</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ROLE B: MANAGER VIEW ("The Situation Room") */}
              {(activeUserRole === 'Manager' || activeUserRole === 'Admin' || activeUserRole === 'Super Admin') && (
                <div className="bento-grid">
                  
                  {/* Team Health Pulse with glowing threshold */}
                  <div className="glass-card orb-glow-purple" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>TEAM HEALTH PULSE</h3>
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <span style={{ fontSize: '48px', fontWeight: '800', color: '#10B981' }}>94%</span>
                      <span style={{ fontSize: '12px', display: 'block', color: '#94a3b8', marginTop: '4px' }}>Excellent engagement</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                      📈 +3% from last week
                    </div>
                  </div>

                  {/* Pending Approvals */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>PENDING ACTION REQUESTS</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
                      <div onClick={() => setActiveTab('leave')} style={{ cursor: 'pointer', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12.5px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Pending Leave Requests</span>
                        <strong style={{ color: '#fbbf24' }}>5</strong>
                      </div>
                      <div onClick={() => setActiveTab('tickets')} style={{ cursor: 'pointer', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12.5px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Active Helpdesk Tickets</span>
                        <strong style={{ color: '#ef4444' }}>3</strong>
                      </div>
                    </div>
                  </div>

                  {/* AI Agent Queue Badge */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>AI OPERATION AGENTS</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <Bot size={24} color="#6366F1" />
                      </div>
                      <div>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>3 Awaiting</span>
                        <span style={{ fontSize: '11px', display: 'block', color: '#94a3b8' }}>Approve in Agent Queue tab</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('agents')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Open Agent Queue
                    </button>
                  </div>

                  {/* Attrition Risk radar details */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>ATTRITION RISK ANALYSIS</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#94a3b8' }}>🟢 Low Risk employees:</span>
                        <strong style={{ color: 'white' }}>8</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#94a3b8' }}>🟡 Medium Risk employees:</span>
                        <strong style={{ color: 'white' }}>3</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#ef4444' }}>🔴 High Risk employees:</span>
                        <strong style={{ color: '#ef4444' }}>1</strong>
                      </div>
                    </div>
                  </div>

                  {/* 5.6 Workload Heatmap grid */}
                  <div className="glass-card" style={{ gridColumn: 'span 8', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>TEAM WORKLOAD HEATMAP (Hours Booked)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {['Rahul', 'Amit', 'Neha', 'Priya'].map((member, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '60px', fontSize: '12.5px', color: 'white' }}>{member}</span>
                          <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                            {[8, 9, 7, 10, 6].map((hours, idx) => (
                              <div
                                key={idx}
                                title={`${hours} hours`}
                                style={{
                                  flex: 1,
                                  height: '24px',
                                  borderRadius: '4px',
                                  background: hours >= 9 ? '#EF4444' : hours >= 8 ? '#10B981' : '#334155',
                                  opacity: hours / 10,
                                  boxShadow: hours >= 9 ? '0 0 8px #EF4444' : 'none'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Live activity timeline stream */}
                  <div className="glass-card" style={{ gridColumn: 'span 12', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>TEAM REAL-TIME ACTIVITY STREAM</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '13px', color: '#f8fafc' }}>
                        <span style={{ color: '#94a3b8', marginRight: '10px' }}>[17:28]</span> OnboardingAgent proposed welcome kits setup for new developer.
                      </div>
                      <div style={{ fontSize: '13px', color: '#f8fafc' }}>
                        <span style={{ color: '#94a3b8', marginRight: '10px' }}>[16:45]</span> Priya Sharma reserved office Desk 2 for tomorrow.
                      </div>
                      <div style={{ fontSize: '13px', color: '#f8fafc' }}>
                        <span style={{ color: '#94a3b8', marginRight: '10px' }}>[15:10]</span> FinanceAgent completed August payroll projections.
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ROLE C: HR OBSERVATORY VIEW */}
              {(activeUserRole === 'HR' || activeUserRole === 'Admin' || activeUserRole === 'Super Admin') && (
                <div className="bento-grid">
                  
                  {/* KPIs */}
                  <div className="glass-card" style={{ gridColumn: 'span 12', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>ORGANIZATION INTELLIGENCE COMPASS</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Headcount</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '6px' }}>142</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Active Staff</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '6px' }}>138</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>New Hires</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10B981', marginTop: '6px' }}>4</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Open Positions</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>12</div>
                      </div>
                    </div>
                  </div>

                  {/* Sankey funnel placeholder paths */}
                  <div className="glass-card" style={{ gridColumn: 'span 6', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>AI RECRUITMENT PIPELINE FLOW</h3>
                    <div style={{ position: 'relative', height: '140px' }}>
                      <svg width="100%" height="100%" viewBox="0 0 300 120">
                        <path d="M 20 20 C 100 20, 100 40, 180 40" fill="none" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="16" />
                        <path d="M 20 60 C 100 60, 100 50, 180 50" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="10" />
                        <path d="M 180 45 C 220 45, 230 70, 280 70" fill="none" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="8" />
                        <text x="10" y="45" fill="white" fontSize="10" fontWeight="bold">Applied (42)</text>
                        <text x="140" y="90" fill="white" fontSize="10" fontWeight="bold">Screened (18)</text>
                        <text x="240" y="110" fill="white" fontSize="10" fontWeight="bold">Offers (4)</text>
                      </svg>
                    </div>
                  </div>

                  {/* Predicted Alerts panel */}
                  <div className="glass-card" style={{ gridColumn: 'span 6', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>PREDICTIVE CAPACITY ALERTS</h3>
                    <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '10px', fontSize: '12.5px', color: '#f87171' }}>
                      🚨 <strong>Engineering team</strong> faces 18% attrition risk in Q3.
                    </div>
                    <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '10px', fontSize: '12.5px', color: '#fbbf24' }}>
                      💡 <strong>Action recommended:</strong> Hire 2 backend developers by August 15.
                    </div>
                  </div>

                </div>
              )}

              {/* ROLE D: FINANCE LEDGER VIEW */}
              {(activeUserRole === 'Finance' || activeUserRole === 'Admin' || activeUserRole === 'Super Admin') && (
                <div className="bento-grid">
                  
                  {/* Monthly Payroll processed ring */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600', alignSelf: 'flex-start' }}>PAYROLL STATUS</h3>
                    <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        <circle cx="55" cy="55" r="45" fill="transparent" stroke="#334155" strokeWidth="8" />
                        <circle cx="55" cy="55" r="45" fill="transparent" stroke="#10b981" strokeWidth="8"
                          strokeDasharray="282.7" strokeDashoffset="42.4" strokeLinecap="round" />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>85%</span>
                        <span style={{ fontSize: '8px', display: 'block', color: '#94a3b8' }}>Processed</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost breakdown donut drawing */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>SPENDING BREAKDOWN</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: 'white' }}>
                      <div>💻 Salaries: 68%</div>
                      <div>🏥 Benefits: 15%</div>
                      <div>🎉 Bonuses: 12%</div>
                    </div>
                  </div>

                  {/* 5.4 Budget Simulator with Sliders */}
                  <div className="glass-card" style={{ gridColumn: 'span 4', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>BUDGET LIVE SIMULATOR</h3>
                    <div>
                      <label style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Simulate New Hires (+{newHiresCount})</label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={newHiresCount}
                        onChange={(e) => setNewHiresCount(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Simulate Raise (+{salaryRaisePct}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={salaryRaisePct}
                        onChange={(e) => setSalaryRaisePct(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>PROJECTED PAYROLL COST</span>
                      <strong style={{ fontSize: '18px', color: '#f8fafc' }}>₹{calculatedPayroll} Crore/month</strong>
                    </div>
                  </div>

                </div>
              )}

              {/* ROLE E: ADMIN PLATFORM CORE VIEW */}
              {(activeUserRole === 'Admin' || activeUserRole === 'Super Admin') && (
                <div className="bento-grid">
                  
                  {/* Platform health latency */}
                  <div className="glass-card" style={{ gridColumn: 'span 6', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>PLATFORM CORE MONITOR</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '13px', color: '#10B981' }}>🟢 All Systems Operational</span>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginTop: '6px' }}>42 Users Online</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>API Latency</span>
                        <strong style={{ fontSize: '18px', display: 'block', color: 'white' }}>45ms</strong>
                      </div>
                    </div>
                  </div>

                  {/* Active modules grid */}
                  <div className="glass-card" style={{ gridColumn: 'span 6', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>MODULE CORE MATRIX</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11.5px', color: 'white' }}>
                      <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>Auth OK</div>
                      <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>Agent OK</div>
                      <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>DB OK</div>
                    </div>
                  </div>

                  {/* Interactive RBAC permissions table preview */}
                  <div className="glass-card" style={{ gridColumn: 'span 12', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>INTERACTIVE RBAC MATRIX</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: 'white' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Role</th>
                          <th style={{ textAlign: 'center', padding: '8px' }}>Users Module</th>
                          <th style={{ textAlign: 'center', padding: '8px' }}>Payroll Module</th>
                          <th style={{ textAlign: 'center', padding: '8px' }}>AI Operations</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px' }}>Super Admin</td>
                          <td style={{ textAlign: 'center', color: '#10b981' }}>Full Access</td>
                          <td style={{ textAlign: 'center', color: '#10b981' }}>Full Access</td>
                          <td style={{ textAlign: 'center', color: '#10b981' }}>Full Access</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px' }}>Manager</td>
                          <td style={{ textAlign: 'center', color: '#fbbf24' }}>Read Only</td>
                          <td style={{ textAlign: 'center', color: '#ef4444' }}>No Access</td>
                          <td style={{ textAlign: 'center', color: '#10b981' }}>Approve Actions</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* Peer Kudos Card */}
              <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>DISPATCH PEER KUDOS POINTS</h3>
                <form onSubmit={handleSendKudos} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Colleague</label>
                    <select value={kudosTo} onChange={(e) => setKudosTo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)', color: 'white' }}>
                      <option value="Rahul">Rahul (HQ)</option>
                      <option value="Amit">Amit (Engineering)</option>
                      <option value="Priya">Priya (HR)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Kudos Message</label>
                    <input
                      type="text"
                      placeholder="Great help on task #442!"
                      value={kudosMsg}
                      onChange={(e) => setKudosMsg(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)', color: 'white' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Points (50-200)</label>
                    <input
                      type="number"
                      min="50"
                      max="200"
                      value={kudosPoints}
                      onChange={(e) => setKudosPoints(parseInt(e.target.value))}
                      style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)', color: 'white' }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>Gift Kudos</button>
                </form>
              </div>

            </div>
          );
        })()}

      {/* 2. ORGANIZATIONS TAB: Departments, Designations, Locations, Shifts, Holidays, Hierarchies */}
      {activeTab === 'organizations' && (
        <OrganizationsTab user={activeUser} />
      )}

      {/* 2.1 EMPLOYEES DIRECTORY & ONBOARDING TAB */}
      {activeTab === 'employees' && (
        <EmployeesTab 
          user={activeUser} 
          prefilledOnboarding={prefilledOnboarding} 
          onClearPrefill={() => setPrefilledOnboarding(null)} 
          initialDeptFilter={aiEmployeeDeptFilter}
          onClearDeptFilter={() => setAiEmployeeDeptFilter('')}
        />
      )}

      {/* 2.2 INSIGHTS GRAPH & AI NARRATIVE TAB */}
      {activeTab === 'insights' && (
        <InsightsTab user={activeUser} />
      )}

      {/* 2.3 AUDIT LOG COMPLIANCE VIEW */}
      {activeTab === 'auditLogs' && (user.role === 'Admin' || user.role === 'Super Admin') && (
        <AuditLogsTab />
      )}

      {/* 2.4 RECRUITMENT PIPELINE */}
      {activeTab === 'recruitment' && (
        <RecruitmentTab user={activeUser} onPrefillOnboarding={handlePrefillOnboarding} />
      )}

      {/* 2.5 ATTENDANCE MANAGEMENT */}
      {activeTab === 'attendance' && (
        <AttendanceTab user={activeUser} />
      )}

      {/* 2.6 LEAVE MANAGEMENT */}
      {activeTab === 'leave' && (
        <LeaveTab user={activeUser} />
      )}

      {/* 2.7 PAYROLL EXPLAINER */}
      {activeTab === 'payroll' && (
        <PayrollTab user={activeUser} />
      )}

      {/* 2.8 PERFORMANCE TARGETS */}
      {activeTab === 'performance' && (
        <PerformanceTab user={activeUser} />
      )}

      {/* 2.9 PROJECTS WORKSPACE */}
      {activeTab === 'projects' && (
        <ProjectsTab user={activeUser} />
      )}

      {/* 2.10 ASSET REGISTRY */}
      {activeTab === 'assets' && (
        <AssetsTab user={activeUser} />
      )}

      {/* 2.11 HELP DESK */}
      {activeTab === 'tickets' && (
        <TicketsTab user={activeUser} />
      )}

      {/* 2.12 DOCUMENTS REPOSITORY */}
      {activeTab === 'documents' && (
        <DocumentsTab user={activeUser} />
      )}

      {/* 2.13 REPORTS & ANALYTICS */}
      {activeTab === 'reports' && (
        <ReportsTab user={activeUser} />
      )}

      {/* 2.14 AGENT QUEUE */}
      {activeTab === 'agents' && (
        <AgentQueueTab user={activeUser} />
      )}

      {/* 2.15 SKILLS MARKETPLACE */}
      {activeTab === 'skills' && (
        <SkillsMarketplaceTab user={activeUser} />
      )}

      {/* 2.16 WORKFORCE SIMULATOR */}
      {activeTab === 'simulator' && (
        <WorkforceSimulatorTab user={activeUser} />
      )}

      {/* 2.17 HYBRID WORK HUB */}
      {activeTab === 'hybrid' && (
        <HybridWorkHubTab user={activeUser} />
      )}

      {/* 2.18 GAMIFICATION & KUDOS */}
      {activeTab === 'gamification' && (
        <GamificationTab user={activeUser} />
      )}

      {/* 2.19 SCENARIO ORG PLANNER */}
      {activeTab === 'scenarioOrg' && (
        <ScenarioOrgChartTab user={activeUser} />
      )}

      {/* 3. INVITES TAB: Table of Codes, Copy Code, Generate Codes */}
      {activeTab === 'invites' && (user.role === 'Admin' || user.role === 'Super Admin' || user.permissions?.includes('invite:generate')) && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Row 1: Invite Tokens */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '32px', width: '100%' }}>
            {/* Active Invites List Table */}
            <div className="auth-card" style={{ maxWidth: '100%', padding: '30px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                ✉ Onboarding Invite Codes
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
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
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                🎫 Generate Invite Token
              </h2>
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
                    {roles.map(r => (
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
                    {organizations.map(org => (
                      <option key={org.id} value={org.name}>{org.name}</option>
                    ))}
                  </select>
                  <label htmlFor="inviteOrg" className="form-label">Assign Department Unit</label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading || organizations.length === 0}>
                  {loading ? 'Generating Code...' : 'Generate Onboarding Token'}
                </button>
              </form>
            </div>
          </div>

          {/* Row 2: Direct Employee Creation & Blocked Accounts Manager */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr', gap: '32px', width: '100%' }}>
            
            {/* Create Employee Direct Form */}
            <div className="auth-card" style={{ maxWidth: '100%', padding: '30px', height: 'fit-content' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                👤 Create Employee Account Direct
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Register new employee files directly without sharing invitation tokens.
              </p>

              <form onSubmit={handleDirectRegisterEmployee}>
                <div className="form-group">
                  <input
                    type="text"
                    id="empName"
                    className="form-control"
                    placeholder=" "
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <label htmlFor="empName" className="form-label">Full Name</label>
                </div>

                <div className="form-group">
                  <input
                    type="email"
                    id="empEmail"
                    className="form-control"
                    placeholder=" "
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <label htmlFor="empEmail" className="form-label">Email Address</label>
                </div>

                <div className="form-group">
                  <input
                    type="password"
                    id="empPassword"
                    className="form-control"
                    placeholder=" "
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <label htmlFor="empPassword" className="form-label">Temporary Password</label>
                </div>

                <div className="form-group form-select-container">
                  <select
                    id="empRoleSelect"
                    className="form-control form-select"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {roles.filter(r => r.level < user.level).map(r => (
                      <option key={r.id} value={r.name}>{r.name} (Level: {r.level})</option>
                    ))}
                  </select>
                  <label htmlFor="empRoleSelect" className="form-label">Assign Role Privilege</label>
                </div>

                <div className="form-group form-select-container">
                  <select
                    id="empOrgSelect"
                    className="form-control form-select"
                    value={empOrg}
                    onChange={(e) => setEmpOrg(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.name}>{org.name}</option>
                    ))}
                  </select>
                  <label htmlFor="empOrgSelect" className="form-label">Assign Department Node</label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading || organizations.length === 0}>
                  {loading ? 'Creating Account...' : 'Create Employee Profile'}
                </button>
              </form>
            </div>

            {/* Blocked Accounts Manager */}
            <div className="auth-card" style={{ maxWidth: '100%', padding: '30px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                🔒 Locked-Out User Security Accounts
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Profiles locked out after 3 failed login attempts. Click unlock to restore access.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(74, 46, 42, 0.08)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Name</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Email</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-dark)' }}>Role</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-dark)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedUsers.length > 0 ? (
                      blockedUsers.map(bUser => (
                        <tr key={bUser.id} style={{ borderBottom: '1px solid rgba(74, 46, 42, 0.04)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{bUser.name}</td>
                          <td style={{ padding: '12px 8px' }}>{bUser.email}</td>
                          <td style={{ padding: '12px 8px' }}>{bUser.role}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '4px 12px', fontSize: '11px', margin: 0, background: '#55efc4', border: '1px solid #55efc4', color: '#10523e' }}
                              onClick={() => handleUnblockUser(bUser.id)}
                              disabled={loading}
                            >
                              🔓 Unlock
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No accounts are currently locked out.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. ROLES TAB: Role Listing & Custom Role Builder */}
      {activeTab === 'roles' && (user.role === 'Super Admin' || user.permissions?.includes('role:manage')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sub-tab navigation */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(74,46,42,0.08)', paddingBottom: '12px' }}>
            <button 
              type="button"
              className={rolesSubTab === 'directory' ? 'btn-primary' : 'btn-secondary'}
              style={{ margin: 0, padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setRolesSubTab('directory')}
            >
              🛡 Workspace Roles Directory
            </button>
            <button 
              type="button"
              className={rolesSubTab === 'hierarchy' ? 'btn-primary' : 'btn-secondary'}
              style={{ margin: 0, padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setRolesSubTab('hierarchy')}
            >
              👁 Role Hierarchy Diagram
            </button>
          </div>

          {rolesSubTab === 'directory' ? (
            <section className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '32px' }}>
              {/* Left Panel: Active Roles Table */}
              <div className="auth-card" style={{ maxWidth: '100%', padding: '30px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                  🛡 Workspace Roles Directory
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  System defaults and custom operational role hierarchies with action permission scopes.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {roles.map(r => {
                    const isSystemRole = ['Super Admin', 'Organization Admin', 'HR Manager', 'Finance Executive', 'IT Administrator', 'Department Manager', 'Team Lead', 'Employee', 'Intern', 'Auditor'].includes(r.name);
                    const isEditing = editingRoleId === r.id;

                    return (
                      <div 
                        key={r.id} 
                        style={{ 
                          padding: '20px', 
                          background: isSystemRole ? 'rgba(74, 46, 42, 0.02)' : '#ffffff', 
                          border: '1px solid rgba(74, 46, 42, 0.08)', 
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              {isSystemRole ? (
                                <Crown size={18} strokeWidth={1.75} style={{ color: '#eab308' }} />
                              ) : (
                                <Shield size={18} strokeWidth={1.75} style={{ color: '#2563eb' }} />
                              )}
                            </span>
                            <strong style={{ fontSize: '15.5px', color: 'var(--text-dark)' }}>{r.name}</strong>
                            {isSystemRole && (
                              <span className="card-badge" style={{ position: 'static', fontSize: '9px', background: 'rgba(74,46,42,0.05)', color: 'var(--text-muted)' }}>SYSTEM</span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', background: 'rgba(247, 215, 148, 0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', color: '#b8860b' }}>
                            Level Weight: {r.level}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {r.permissions.map(p => (
                            <span 
                              key={p} 
                              className="user-badge badge-employee" 
                              style={{ fontSize: '10px', textTransform: 'lowercase', background: 'rgba(74, 46, 42, 0.04)', color: 'var(--text-dark)', border: '1px solid rgba(74, 46, 42, 0.08)' }}
                            >
                              🔑 {p}
                            </span>
                          ))}
                        </div>

                        {/* Actions (Only for custom roles where role level < user level) */}
                        {!isSystemRole && r.level < user.level && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignSelf: 'flex-end' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '4px 12px', fontSize: '11px', margin: 0 }}
                              onClick={() => {
                                setEditingRoleId(r.id);
                                setEditRoleName(r.name);
                                setEditRoleLevel(r.level);
                                setEditRolePerms(r.permissions);
                              }}
                            >
                              ✏ Edit
                            </button>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '4px 12px', fontSize: '11px', margin: 0, background: 'rgba(220, 80, 80, 0.1)', color: 'var(--pastel-red)', border: '1px solid rgba(220, 80, 80, 0.2)' }}
                              onClick={() => handleDeleteRole(r.id)}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Role Builder (Create or Edit Form) */}
              <div className="auth-card" style={{ maxWidth: '100%', padding: '30px', height: 'fit-content' }}>
                {editingRoleId ? (
                  // Edit Role Form
                  <>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                      ✏ Edit Workspace Role
                    </h2>
                    <form onSubmit={handleUpdateRole}>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder=" "
                          value={editRoleName}
                          onChange={(e) => setEditRoleName(e.target.value)}
                          required
                        />
                        <label className="form-label">Role Name</label>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Hierarchy Weight Level</span>
                          <strong style={{ color: '#b8860b' }}>Level: {editRoleLevel}</strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          style={{ width: '100%', accentColor: 'var(--pastel-red)' }}
                          value={editRoleLevel}
                          onChange={(e) => setEditRoleLevel(parseInt(e.target.value))}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Must be lower than your hierarchy weight ({user.level})</span>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '10px' }}>
                          Assign Action Permissions
                        </span>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px', 
                          maxHeight: '220px', 
                          overflowY: 'auto', 
                          padding: '12px',
                          background: 'rgba(74, 46, 42, 0.02)',
                          border: '1px solid rgba(74, 46, 42, 0.08)',
                          borderRadius: '8px'
                        }}>
                          {PERMISSION_OPTIONS.map(perm => (
                            <label key={perm} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={editRolePerms.includes(perm)}
                                style={{ marginTop: '3px' }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditRolePerms([...editRolePerms, perm]);
                                  } else {
                                    setEditRolePerms(editRolePerms.filter(p => p !== perm));
                                  }
                                }}
                              />
                              <div>
                                <strong style={{ display: 'block', color: 'var(--text-dark)' }}>{perm}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ALL_PERMISSIONS_MAPPING[perm] || 'Custom Permission Scope'}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn-primary" style={{ flexGrow: 1 }} disabled={loading}>
                          Save Role Settings
                        </button>
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={{ width: '100px' }} 
                          onClick={() => setEditingRoleId(null)}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  // Create Role Form
                  <>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                      🎫 Custom Role Builder
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                      Create modular user permissions levels to delegate administration.
                    </p>

                    <form onSubmit={handleCreateRole}>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder=" "
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          required
                        />
                        <label className="form-label">Role Name (e.g. Engineer)</label>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Hierarchy Weight Level</span>
                          <strong style={{ color: '#b8860b' }}>Level: {newRoleLevel}</strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          style={{ width: '100%', accentColor: 'var(--pastel-red)' }}
                          value={newRoleLevel}
                          onChange={(e) => setNewRoleLevel(parseInt(e.target.value))}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Must be lower than your hierarchy weight ({user.level})</span>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '10px' }}>
                          Assign Action Permissions
                        </span>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px', 
                          maxHeight: '220px', 
                          overflowY: 'auto', 
                          padding: '12px',
                          background: 'rgba(74, 46, 42, 0.02)',
                          border: '1px solid rgba(74, 46, 42, 0.08)',
                          borderRadius: '8px'
                        }}>
                          {PERMISSION_OPTIONS.map(perm => (
                            <label key={perm} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={newRolePerms.includes(perm)}
                                style={{ marginTop: '3px' }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewRolePerms([...newRolePerms, perm]);
                                  } else {
                                    setNewRolePerms(newRolePerms.filter(p => p !== perm));
                                  }
                                }}
                              />
                              <div>
                                <strong style={{ display: 'block', color: 'var(--text-dark)' }}>{perm}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ALL_PERMISSIONS_MAPPING[perm] || 'Custom Permission Scope'}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button type="submit" className="btn-primary" disabled={loading || !newRoleName}>
                        Create Custom Role
                      </button>
                    </form>
                  </>
                )}
              </div>
            </section>
          ) : (
            <section className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px' }}>
              {/* Left Panel: Role Hierarchy Tree */}
              <div className="auth-card" style={{ maxWidth: '100%', padding: '30px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '16px' }}>
                  👁 Role Hierarchy Diagram
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  Visual reporting structure demonstrating corporate management chains.
                </p>

                <div className="tree-container" style={{ padding: '16px', background: 'rgba(74, 46, 42, 0.01)', borderRadius: '16px', border: '1px dashed rgba(74, 46, 42, 0.12)' }}>
                  {renderRoleHierarchyNode(roleHierarchyData)}
                </div>
              </div>

              {/* Right Panel: Lateral Roles Explainer */}
              <div className="auth-card" style={{ height: 'fit-content', padding: '24px', background: 'rgba(74, 46, 42, 0.01)', border: '1px solid rgba(74, 46, 42, 0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚖ Lateral Compliance Roles
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                  These compliance and auditing roles sit outside the standard vertical reporting hierarchy. They possess independent read privileges across all platform scopes.
                </p>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(74, 46, 42, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>Auditor</strong>
                    <span style={{ fontSize: '10px', background: '#cbd5e1', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: 'auto' }}>
                      Lvl 15
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Reports into: None (Lateral Independent compliance)
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {roles.find(r => r.name === 'Auditor')?.permissions.map(p => (
                      <span key={p} style={{ fontSize: '9px', background: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* 5. TEMPORARY DELEGATIONS TAB */}
      {activeTab === 'delegations' && (
        <section className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            {/* Left Card: Active Delegation list */}
            <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardList size={20} strokeWidth={1.75} /> Active Delegation Hand-offs
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Temporary privilege transfers and acting roles.</p>
                </div>
              </div>

              {delegations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No active temporary role delegations established in this workspace.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(148, 163, 184, 0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 8px' }}>From</th>
                        <th style={{ padding: '12px 8px' }}>To</th>
                        <th style={{ padding: '12px 8px' }}>Delegated Role</th>
                        <th style={{ padding: '12px 8px' }}>Duration</th>
                        <th style={{ padding: '12px 8px' }}>Status</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delegations.map((del) => {
                        const isActive = del.status === 'active';
                        return (
                          <tr key={del.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                            <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{del.from_name}</td>
                            <td style={{ padding: '16px 8px' }}>{del.to_name}</td>
                            <td style={{ padding: '16px 8px' }}>
                              <span style={{ fontSize: '11px', background: 'var(--pastel-yellow-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                                {del.role_name}
                              </span>
                            </td>
                            <td style={{ padding: '16px 8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              <div>Start: {new Date(del.start_date).toLocaleString()}</div>
                              <div>End: {new Date(del.end_date).toLocaleString()}</div>
                            </td>
                            <td style={{ padding: '16px 8px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                background: isActive ? 'rgba(85, 239, 196, 0.15)' : 'rgba(74, 46, 42, 0.05)',
                                color: isActive ? '#10523e' : 'var(--text-muted)'
                              }}>
                                {del.status}
                              </span>
                            </td>
                            <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                              {isActive && (del.delegate_from_id === user.id || user.role === 'Super Admin' || user.permissions?.includes('role:manage')) && (
                                <button
                                  className="btn-danger"
                                  style={{ padding: '4px 10px', fontSize: '11px', margin: 0 }}
                                  onClick={() => handleRevokeDelegation(del.id)}
                                >
                                  <Trash2 size={12} style={{ marginRight: '4px' }} /> Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Card: Handoff Creator */}
            <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '8px' }}>⚡ Delegate Your Privileges</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Temporarily assign one of your roles to a coworker date-range bounded.</p>
              
              <form onSubmit={handleDelegateSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Select Delegate Target (Coworker)
                  </label>
                  <select
                    className="form-input"
                    value={delegateToId}
                    onChange={(e) => setDelegateToId(e.target.value)}
                    style={{ background: '#ffffff' }}
                  >
                    <option value="">-- Choose employee --</option>
                    {usersList.filter(u => u.id !== user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.role}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Select Role to Delegate
                  </label>
                  <select
                    className="form-input"
                    value={delegateRole}
                    onChange={(e) => setDelegateRole(e.target.value)}
                    style={{ background: '#ffffff' }}
                  >
                    {roles.filter(r => r.level <= user.level).map(r => (
                      <option key={r.name} value={r.name}>{r.name} (Level: {r.level})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cannot exceed your hierarchy level ({user.level})</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={delegateStartDate}
                      onChange={(e) => setDelegateStartDate(e.target.value)}
                      style={{ background: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={delegateEndDate}
                      onChange={(e) => setDelegateEndDate(e.target.value)}
                      style={{ background: '#ffffff' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={!delegateToId}>
                  Establish Delegation Handoff
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* 6. EMAIL LOGS SIMULATOR TAB */}
      {activeTab === 'emailLogs' && (user.role === 'Admin' || user.role === 'Super Admin') && (
        <section className="fade-in">
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-dark)' }}>✉ Simulated Email Delivery Stream</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Real-time capture of all system welcome notifications and security alerts.</p>
              </div>
              <button 
                className="btn-danger" 
                style={{ padding: '8px 16px', fontSize: '12px' }}
                onClick={handleClearEmailLogs}
              >
                Clear Log History
              </button>
            </div>

            {emailLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
                No captured emails logged in this simulation session. Trigger an action (like onboarding signup or password resets) to populate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {emailLogs.map(log => (
                  <div key={log.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '12px 16px', background: 'rgba(148, 163, 184, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                      <div>
                        <strong>To:</strong> <span style={{ color: 'var(--pastel-red)', fontWeight: 'bold' }}>{log.to_email}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    {/* Meta info */}
                    <div style={{ padding: '12px 16px', background: 'rgba(148, 163, 184, 0.01)', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                      <div>
                        <strong>Subject:</strong> {log.subject}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                        <strong>Template Identifier:</strong> <span style={{ background: 'rgba(148, 163, 184, 0.1)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{log.template}</span>
                      </div>
                    </div>
                    {/* Email preview frame */}
                    <div style={{ padding: '20px', background: '#fdfdfd', fontSize: '13.5px', fontFamily: 'system-ui', lineHeight: '1.6', color: '#2c3e50', whiteSpace: 'pre-wrap' }}>
                      {log.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* COMMAND PALETTE OVERLAY */}
      {isCmdOpen && (
        <div className="cmd-palette-backdrop" onClick={() => setIsCmdOpen(false)}>
          <div className="cmd-palette-box" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="cmd-palette-input"
              placeholder="Search actions, navigation tabs... (e.g. 'audit', 'employees')"
              value={cmdQuery}
              onChange={(e) => handleCmdSearch(e.target.value)}
              autoFocus
            />
            <div className="cmd-palette-results">
              {cmdResults.length > 0 ? (
                cmdResults.map((res, idx) => (
                  <div
                    key={idx}
                    className="cmd-palette-item"
                    onClick={() => {
                      setActiveTab(res.tab);
                      setIsCmdOpen(false);
                      setCmdQuery('');
                      setCmdResults([]);
                    }}
                  >
                    <span>⚡</span> {res.label}
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '13.5px' }}>
                  No navigation matching. Type 'departments', 'employees', or 'audit'.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Chat Widget */}
      <div className="ai-widget-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        {/* Toggle Button */}
        <button
          className="ai-toggle-btn"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--pastel-red) 0%, var(--pastel-yellow) 100%)',
            color: 'white',
            border: 'none',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-smooth)'
          }}
          onClick={() => setIsAiOpen(!isAiOpen)}
        >
          {isAiOpen ? '✕' : <MessageCircle size={28} strokeWidth={1.75} />}
        </button>

        {/* Chat Drawer */}
        {isAiOpen && (
          <div
            className="ai-chat-drawer"
            style={{
              position: 'absolute',
              bottom: '80px',
              right: '0',
              width: '380px',
              height: '500px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, var(--pastel-red) 0%, var(--pastel-yellow) 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <MessageCircle size={24} strokeWidth={1.75} style={{ color: 'white' }} />
              <div>
                <h4 style={{ margin: 0, fontWeight: '600' }}>AI Ops Assistant</h4>
                <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>Claude AI Proxy Agent</p>
              </div>
            </div>

            {/* Message Area */}
            <div
              style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#f8fafc'
              }}
            >
              {aiMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'var(--pastel-red)' : '#ffffff',
                    color: msg.role === 'user' ? 'white' : 'var(--text-dark)',
                    boxShadow: msg.role === 'user' ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(148, 163, 184, 0.1)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.content}
                </div>
              ))}
              {isAiTyping && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                  AI is searching SQLite database...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleAiSubmit}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px',
                background: '#ffffff'
              }}
            >
              <input
                type="text"
                placeholder="Ask about staff, departments, roles..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'var(--pastel-red)',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      <AIAssistantWidget 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSetDeptFilter={setAiEmployeeDeptFilter}
      />

      </main>
    </div>
  );
};

// Audit Logs Tab subcomponent declaration
const AuditLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/audit-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wfm_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.user_name && log.user_name.toLowerCase().includes(search.toLowerCase())) ||
    (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="auth-card" style={{ padding: '30px', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
            System Audit Compliance Log
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Real-time tracking of security policies, separation events, and user logins.
          </p>
        </div>
        <input
          type="text"
          placeholder="Filter audit actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            width: '240px'
          }}
        />
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '10px 8px' }}>Timestamp</th>
              <th style={{ padding: '10px 8px' }}>User</th>
              <th style={{ padding: '10px 8px' }}>Action</th>
              <th style={{ padding: '10px 8px' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                <td style={{ padding: '10px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ padding: '10px 8px', fontWeight: '600' }}>{log.user_name || 'System Guest'} ({log.user_email || 'N/A'})</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', color: '#475569' }}>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
