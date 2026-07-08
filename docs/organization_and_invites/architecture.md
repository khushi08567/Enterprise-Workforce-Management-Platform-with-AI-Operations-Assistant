# Architecture & Flows: Organization and Invites

This document details the system architectures, interactions, and sequence diagrams for Day-1 features.

---

## 1. System Architecture

```mermaid
graph TD
  User((Admin User)) -->|Interacts| Client[React Client]
  
  subgraph Frontend Views
    Client --> Overview[SaaS Dashboard Grid]
    Client --> OrgPanel[Organization Directory Panel]
    Client --> InvitePanel[Invite Generator Panel]
  end

  subgraph Backend Modules
    OrgPanel -->|POST /api/v1/organizations| OrgRouter[modules/organization/api/v1/routes.js]
    InvitePanel -->|POST /api/v1/invites| InviteRouter[modules/invite/api/v1/routes.js]
  end

  subgraph Database Layer
    OrgRouter --> DB[(database.sqlite)]
    InviteRouter --> DB
  end
```

### Architectural Submodules
1. **Express Middlewares**: 
   * `authenticateToken`: Decodes JWT tokens.
   * `requireRole(['Admin', 'Super Admin'])`: Protects organization creation and invite generation routes.
2. **SQLite Database Helpers**:
   * Uses serialized runs to insert child nodes and register invitation states.

---

## 2. Complete Working Flow (Invite-Registration Pipeline)

```mermaid
sequenceDiagram
  autonumber
  actor Admin as Admin / HR
  participant FE as React Client
  participant BE as Express API
  actor Employee as New Employee
  
  Admin->>FE: Select Role & Org, click Generate
  FE->>BE: POST /api/v1/invites
  BE-->>FE: HTTP 201 (INV-CODE-XXXX)
  Admin->>Employee: Share generated INV-CODE
  Employee->>FE: Input INV-CODE on Register Form
  FE->>BE: POST /api/v1/invites/validate
  BE-->>FE: HTTP 200 (Autofills Role & Org, disables inputs)
  Employee->>FE: Enter Name & Password, click Sign Up
  FE->>BE: POST /api/v1/auth/register (inviteCode)
  BE-->>FE: HTTP 201 (Redeems code, registers user)
```

1. **Generation**: Admin requests a new invite code with specific role/department constraints. Backend generates a unique random code and writes it to SQLite.
2. **Validation**: The prospective employee inputs this code on the registration page. Frontend makes an asynchronous validation call. If verified, role and organization selects are autofilled and locked.
3. **Consuming**: When signup completes, the user account is created and the invite token is marked as `redeemed` linked to the new user account ID.
