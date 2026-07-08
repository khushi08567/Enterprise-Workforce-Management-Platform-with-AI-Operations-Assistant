# Database & Access Control: Organization & Invites

This document details database tables, access controls, and security middlewares.

---

## 1. Database Schema

### Table: `organizations`
Maps corporate hierarchy tree nodes.
* `id` (INTEGER, Primary Key, Auto Increment)
* `name` (TEXT, Unique, Not Null)
* `parent_id` (INTEGER, Nullable, References `organizations(id)`)
* `created_at` (DATETIME, default CURRENT_TIMESTAMP)

### Table: `invites`
Stores active/redeemed registration tokens.
* `id` (INTEGER, Primary Key, Auto Increment)
* `code` (TEXT, Unique, Not Null)
* `role` (TEXT, Not Null)
* `organization` (TEXT, Not Null)
* `created_by` (INTEGER, References `users(id)`)
* `status` (TEXT, Default 'active')
* `redeemed_by` (INTEGER, Nullable, References `users(id)`)
* `created_at` (DATETIME, default CURRENT_TIMESTAMP)

---

## 2. Access Control Policies (RBAC Matrix)

| Role | Organization Directory | Department Creation | Invite Code Generation |
| :--- | :--- | :--- | :--- |
| **Employee** | **READ ONLY** | ACCESS DENIED 🔒 | ACCESS DENIED 🔒 |
| **Admin** | **READ & WRITE** | **ALLOWED** | **ALLOWED** |
| **Super Admin** | **READ & WRITE** | **ALLOWED** | **ALLOWED** |

### Endpoint Access Enforcement (Middleware Binding)
Middlewares bind roles to backend routes:
```javascript
// Add Department Node
router.post('/', authenticateToken, requireRole(['Admin', 'Super Admin']), async (req, res) => { ... });

// Generate Onboarding Token
router.post('/', authenticateToken, requireRole(['Admin', 'Super Admin']), async (req, res) => { ... });
```
* Note: `POST /api/v1/invites/validate` is public to verify codes during signups before users have accounts.
