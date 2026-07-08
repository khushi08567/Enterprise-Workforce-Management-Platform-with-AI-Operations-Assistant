# Organization and Invites (Day 1 Module)

This folder contains the complete technical specifications, workflows, and database designs for the **Organization Tree Visualizer** and **Onboarding Invite Code Manager** submodules.

---

## 1. Purpose and Functionality

* **Organization Tree Visualizer**: Exposes the company's organizational structures and departmental hierarchy. Admins and Super Admins can add child nodes to parent directories to construct complex org tree structures.
* **Onboarding Invite Code Manager**: Allows administrators to generate secure, one-time invitation keys linked to preset roles and organizations. New users can sign up with these keys, bypassing standard access code challenges and manual role assignments.

---

## 2. All Submodules

1. **Hierarchy Tree Engine (Organizations)**:
   * Backend: `/api/v1/organizations` endpoint to retrieve flat nodes and add new departments.
   * Frontend: Renders parent-child nodes dynamically using indented guidelines.
2. **Invite Token Generator (Invites)**:
   * Backend: `/api/v1/invites` CRUD to generate, read, and validate invite tokens.
   * Frontend: Onboarding manager to select roles, assign nodes, copy codes, and view active/redeemed statuses.
3. **Invite Registration Bridge (Auth Signup)**:
   * Frontend: Signup code validator that queries invite databases, autofills fields, and registers users securely.

---

## 3. UI Wireframe Layout

### Organization Directory Panel
```
+-----------------------------------------------------------------------------+
| 🏢 Enterprise Organization Tree                                             |
| Hierarchical mapping of active corporate units and parent nodes.             |
|                                                                             |
|  👑 Main Corp (ID: 1)                                                       |
|  ├── 🏢 Engineering (ID: 2)                                                 |
|  └── 🏢 Marketing (ID: 3)                                                   |
|                                                                             |
|  [➕ Add Department Node]                                                   |
|  * Department / Unit Name: [ Tech Support        ]                          |
|  * Select Parent Node:    [ Engineering (ID: 2)  ▼ ]                        |
|  [ Add Department Unit ]                                                    |
+-----------------------------------------------------------------------------+
```

### Onboarding Invite Generator Panel
```
+-----------------------------------------------------------------------------+
| 🎫 Generate Invite Token                                                    |
| Create locked invite links for new employees.                               |
|                                                                             |
| * Assign Role:       [ Employee             ▼ ]                             |
| * Assign Department: [ Engineering          ▼ ]                             |
| [ Generate Onboarding Token ]                                               |
|                                                                             |
| Active Onboarding Invites:                                                  |
| +--------------------+-----------+--------------+----------+--------------+ |
| | Invite Code        | Role      | Department   | Status   | Actions      | |
| +--------------------+-----------+--------------+----------+--------------+ |
| | INV-8X2F-9W23      | Employee  | Engineering  | active   | [Copy Code]  | |
| | INV-1P9S-4K20      | Admin     | Marketing    | redeemed | (Redeemed)   | |
| +--------------------+-----------+--------------+----------+--------------+ |
+-----------------------------------------------------------------------------+
```
