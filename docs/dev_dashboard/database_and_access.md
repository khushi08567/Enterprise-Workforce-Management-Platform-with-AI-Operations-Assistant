# Database and Access Control: Dev Dashboard

This document details the database interaction structures and access control mechanisms for the Developer Dashboard Workspace.

---

## 1. Database Schema & Interactions

The developer dashboard reads data from system configuration tables inside our SQLite database.

### Core SQLite Tables

#### 1. `dev_metrics`
Tracks performance counts per active workspace project.
* `id` (INTEGER, Primary Key, Auto Increment)
* `workspace_name` (VARCHAR, Unique)
* `branches_count` (INTEGER)
* `commits_count` (INTEGER)
* `pull_requests` (INTEGER)
* `logged_hours` (REAL)
* `completed_tickets` (INTEGER)

#### 2. `system_logs`
Stores diagnostic outputs generated during express boot sequences.
* `id` (INTEGER, Primary Key, Auto Increment)
* `log_type` (VARCHAR: INFO, SUCCESS, WARN, ERROR)
* `message` (TEXT)
* `created_at` (TIMESTAMP, default CURRENT_TIMESTAMP)

---

## 2. Access Control Policies (RBAC Matrix)

| Role | Access Level | Description / Actions Allowed |
| :--- | :--- | :--- |
| **Employee** (Developer) | **READ_WRITE** | Can read performance metrics, query active branch counts, run diagnostic `/health` commands, and log coding hours. |
| **Admin** (Dev Manager) | **FULL_ACCESS** | Can read development metrics, inspect full microservice system logs, check SQLite server latency, and trigger log rotations. |
| **Super Admin** | **FULL_ACCESS** | Can read system logs, clear shell caches, mount new API subpaths, and reset the SQLite database. |

### Route-Level Middlewares
Backend access control is verified using the core authorization middleware:
```javascript
// Example middleware configuration
import { checkRole } from '#@/core/middleware/auth';

// Only developers, admins, and super-admins can read dev logs
router.get('/logs', checkRole(['Employee', 'Admin', 'Super Admin']), (req, res) => { ... });
```
*(Note: During development sandbox runs, authorization is bypassed to permit offline layout checking).*
