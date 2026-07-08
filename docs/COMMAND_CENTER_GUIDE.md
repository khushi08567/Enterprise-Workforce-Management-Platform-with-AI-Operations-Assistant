# 📘 Enterprise Workforce Management Platform with AI Operations Assistant
## Complete System Features & User Flow Documentation

This document describes all implemented modules, workflows, and access pathways for employees, managers, HR, and admins.

---

## 🗺️ Navigation & Platform Core Controls

### ⌨️ Command Palette (Cmd + K / Ctrl + K)
- **What it does**: Provides instant platform-wide search, filtering, and page navigation overlay modal.
- **How to access**: Press `Ctrl + K` or `Cmd + K` on any dashboard screen.
- **User Flow**:
  1. Open palette overlay.
  2. Type keywords (e.g. "Leave", "Salary", "Recruit").
  3. Hit Enter to instantly redirect sidebar viewport tabs.

### 🌗 Dark Mode Theme Toggle
- **What it does**: Instantly translates CSS styling parameters between Light theme slate properties and Slate-900 Dark mode layers.
- **How to access**: Click the `🌓` toggle widget located in the top-right header corner of the dashboard dashboard menu.

---

## 👥 Modules 1 - 3: Platform Setup & Compliance

### 🏢 Organization Setup
- **What it does**: Defines departments, designations, shifts, holidays, and office location coordinates.
- **How to access**: Click the **Organizations** tab in the sidebar menu.
- **User Flow**:
  1. Admins configure workspace properties.
  2. Map locations and specify shift hours (09:00 - 18:00).
  3. Visualizes active corporate structure maps.

### 📋 Employee Wizard Directory
- **What it does**: Onboards team members using step-by-step forms verifying data constraints (e.g. email uniqueness, valid mobile digits).
- **How to access**: Click the **Employees** tab in the sidebar menu.

### 🛡️ Compliance Audit Logging
- **What it does**: Captures write/mutation API request events, executing user, target row state changes, and timestamps for system audits.
- **How to access**: Click the **Audit Logs** tab (visible to Admins/Super Admins only).

---

## 💼 Modules 4 - 8: Workforce Operations

### 🤝 Recruitment Pipeline (M-04)
- **What it does**: Manages candidates, schedules technical interviews, drafts offer letters, and automates onboarding.
- **How to access**: Click the **Recruitment** tab in the sidebar menu.
- **User Flow**:
  1. Candidates are added to the Kanban board columns.
  2. Move to "Interview Scheduled" -> schedules date/time.
  3. Move to "Offer" -> generates baseline salary figures.
  4. Move to "Hired" -> prompts the onboarding setup script.

### ⏰ Attendance Tracker (M-05)
- **What it does**: Logs work timings, shift exceptions, and location verification check-ins.
- **How to access**: Click the **Attendance** tab in the sidebar menu (or Today Shift bento box).

### 📅 Leave Pipeline (M-06)
- **What it does**: Tracks vacation requests against leave balances, routing approvals to designated managers.
- **How to access**: Click the **Leave** tab in the sidebar.

### 💰 Payroll Explainer (M-07)
- **What it does**: Details tax deductions, professional fees, net payouts, and downloads payslip files.
- **How to access**: Click the **Payroll** tab in the sidebar.

### 🎯 Performance & OKR Goals (M-08)
- **What it does**: Tracks organizational KPIs, target progress bars, and annual manager review forms.
- **How to access**: Click the **Performance** tab in the sidebar.

---

## 📂 Modules 9 - 12: Collaboration & Support

### 🚀 Projects Kanban Boards (M-09)
- **What it does**: Orchestrates project tasks, deadline trackers, assignments, and drag-and-drop statuses.
- **How to access**: Click the **Projects** tab in the sidebar.

### 💻 Hardware Asset Registry (M-10)
- **What it does**: Registers company hardware serials, tracks check-in/out histories, and updates statuses.
- **How to access**: Click the **Assets** tab in the sidebar.

### 🛠 Helpdesk Support Tickets (M-11)
- **What it does**: Opens support tickets. Auto-assigns tickets to HR or IT depending on query categories.
- **How to access**: Click the **Tickets** tab in the sidebar.

### 📂 Policy Document Repository (M-12)
- **What it does**: Hosts PDF policy guides, tracking read-only document versions and permissions restrictions.
- **How to access**: Click the **Policy Documents** tab in the sidebar.

---

## 🤖 Modules 13 - 15: Platform Intelligence

### 🔔 Notification Center (M-13)
- **What it does**: Delivers real-time toast alerts and socket messages for task assignments, approvals, and support ticket updates.
- **How to access**: Toggle the Notification bell icon located in the top bar.

### 📊 SVG Reports & Analytics (M-14)
- **What it does**: Renders SVG diagrams for salaries, leave, and attendance distributions, enabling raw CSV data exports.
- **How to access**: Click the **Reports & Analytics** tab in the sidebar.

### 💬 Persistent AI Assistant Widget (M-15)
- **What it does**: Evaluates natural language commands, answers questions using RAG documents, and searches SQLite records.
- **How to access**: Toggle the floating **AgentOrb** located at the bottom-right corner.

---

## 🚀 P0 Competitive Differentiators (Enhancements)

### 🤖 AI Agent Queue (ENH-01)
- **What it does**: Manages proposed operations actions (like burnout leaves or onboarding registrations) waiting for manager approval.
- **How to access**: Click the **Agent Queue** tab in the sidebar.
- **User Flow**:
  1. AI analyzes burnout or onboarding events.
  2. Proposes action inside the queue.
  3. Manager clicks "Approve" -> executes database insertions and sends email alerts.

### 🧠 Skills Marketplace (ENH-02)
- **What it does**: Renders department skills heatmap matrices, matches candidates to projects, and facilitates internal gig bidding.
- **How to access**: Click the **Skills Marketplace** tab in the sidebar.

### 📊 Attrition Simulator (ENH-03)
- **What it does**: Projects organizational capacity changes under different slider variables (new hires, salary raises, budget cuts).
- **How to access**: Click the **Workforce Simulator** tab in the sidebar.

### 🏠 Hybrid Work Map (ENH-05)
- **What it does**: Tracks office capacity bookings. Displays floor desk coordinate maps.
- **How to access**: Click the **Hybrid Work Hub** tab in the sidebar.

### 🎮 Gamified kudos Gifter (ENH-08)
- **What it does**: Rewards points, milestones badges, and peer-to-peer Kudos points.
- **How to access**: Use the Kudos gifting widget located at the bottom of the Bento Grid Dashboard.

### 🏢 Org Scenario Sandbox (ENH-10)
- **What it does**: Simulates restructuring employee managers and forecasts monthly salary delta results.
- **How to access**: Click the **Scenario Org Planner** tab in the sidebar.
