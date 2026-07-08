# API Specifications: Organization and Invites

This document details the REST endpoints and subroutines used by Day-1 features.

---

## 1. REST Endpoints

### 1. GET /api/v1/organizations
Returns flat list of corporate nodes.
* **Authentication**: Required (JWT Bearer)
* **Response Payload (HTTP 200 OK)**:
```json
{
  "organizations": [
    { "id": 1, "name": "Main Corp", "parent_id": null },
    { "id": 2, "name": "Engineering", "parent_id": 1 },
    { "id": 3, "name": "Marketing", "parent_id": 1 }
  ]
}
```

### 2. POST /api/v1/organizations
Creates a new department child node.
* **Authentication**: Required (Admin/Super Admin only)
* **Request Body**:
```json
{
  "name": "Quality Assurance",
  "parentId": 2
}
```
* **Response Payload (HTTP 201 Created)**:
```json
{
  "message": "Organization node registered successfully.",
  "organization": {
    "id": 4,
    "name": "Quality Assurance",
    "parent_id": 2
  }
}
```

### 3. POST /api/v1/invites
Generates a new invitation token.
* **Authentication**: Required (Admin/Super Admin only)
* **Request Body**:
```json
{
  "role": "Employee",
  "organization": "Engineering"
}
```
* **Response Payload (HTTP 201 Created)**:
```json
{
  "message": "Invite code generated successfully.",
  "invite": {
    "code": "INV-7X2A-9B3E",
    "role": "Employee",
    "organization": "Engineering",
    "status": "active"
  }
}
```

### 4. POST /api/v1/invites/validate
Validates an invite token.
* **Authentication**: None (Public)
* **Request Body**:
```json
{
  "code": "INV-7X2A-9B3E"
}
```
* **Response Payload (HTTP 200 OK)**:
```json
{
  "valid": true,
  "role": "Employee",
  "organization": "Engineering"
}
```

---

## 2. Key Code Subroutines

* **`renderOrgTree(parentId)`** (Frontend: `Dashboard.jsx`):
  * **Input**: `parentId: number`
  * **Output**: Recursive rendering of nested bullet lists based on cached organization arrays.
* **`handleValidateInvite()`** (Frontend: `Register.jsx`):
  * **Description**: Queries validation endpoint, configures role/org settings, and locks fields.
