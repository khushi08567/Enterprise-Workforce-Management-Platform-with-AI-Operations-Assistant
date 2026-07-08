# API Specifications & Payload Schemas: Dev Dashboard

This document details the REST endpoints and subroutines used by the Developer Dashboard Workspace.

---

## 1. REST Endpoints

### 1. GET /api/v1/dev/metrics
Retrieves developer metrics, including commit count and branches.
* **Authentication**: None (Development Sandbox)
* **Response Header**: `Content-Type: application/json`
* **Response Payload (HTTP 200 OK)**:
```json
{
  "metrics": {
    "activeBranches": 4,
    "commitsCount": 284,
    "openPullRequests": 2,
    "loggedHours": 38.5,
    "completedTickets": 12,
    "systemHealth": "98%"
  }
}
```

---

### 2. GET /api/v1/dev/logs
Returns microservice system diagnostics and connection statuses.
* **Authentication**: None (Development Sandbox)
* **Response Header**: `Content-Type: application/json`
* **Response Payload (HTTP 200 OK)**:
```json
{
  "logs": [
    {
      "timestamp": "2026-07-01T11:55:00.000Z",
      "type": "INFO",
      "message": "Initialized Vite Client hot module reload module."
    },
    {
      "timestamp": "2026-07-01T11:55:10.000Z",
      "type": "SUCCESS",
      "message": "SQLite database schemas compiled successfully."
    },
    {
      "timestamp": "2026-07-01T11:55:20.000Z",
      "type": "WARN",
      "message": "Deprecation Warning: experimental-specifier-resolution is deprecated."
    }
  ]
}
```

---

## 2. Subroutines and Functions

### Backend Codebase
* **`GET /metrics` Route handler**:
  * **File**: `backend/src/modules/dev/api/v1/routes.js`
  * **Description**: Processes requests and returns a structured KPI statistics object.
* **`GET /logs` Route handler**:
  * **File**: `backend/src/modules/dev/api/v1/routes.js`
  * **Description**: Returns recent system events sorted by timestamp.

### Frontend Codebase
* **`handleCommandSubmit(e)`**:
  * **File**: `frontend/src/components/DevDashboard.jsx`
  * **Arguments**: `e: FormEvent` (intercepts enter submissions)
  * **Description**: Intercepts command inputs, matches key terms (e.g. `/status`, `/help`, `/logs`), and fetches remote data or clears the console buffer.
