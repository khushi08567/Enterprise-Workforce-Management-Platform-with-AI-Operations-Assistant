# Tech Architecture & Flow: Developer Dashboard

This document details the frontend and backend architectures and complete data workflows for the Developer Dashboard Workspace.

---

## 1. System Architecture

The feature integrates into the modular layout of our platform:

```mermaid
graph TD
  User((Developer User)) -->|Interacts| Client[React Frontend Client]
  
  subgraph Frontend Components
    Client --> AppView[App.jsx Switcher]
    AppView --> Gallery[SelectTemplate.jsx]
    AppView --> DevDash[DevDashboard.jsx]
  end

  subgraph Backend Modules
    DevDash -->|GET /api/v1/dev/metrics| DevRouter[modules/dev/api/v1/routes.js]
    DevDash -->|GET /api/v1/dev/logs| DevRouter
    DevDash -->|GET /api/v1/health| HealthRouter[api/v1/routes/index.js]
  end

  subgraph Database Layer
    DevRouter --> SQLite[database.sqlite]
  end
```

### Frontend Architecture
* **`SelectTemplate.jsx`**: Manages template card selection states. If the developer selects template card ID 8, a floating bar triggers a workspace launch sequence.
* **`DevDashboard.jsx`**: Keeps track of local metric counters and manages a command buffer array for terminal log stdout. A form intercepts submit events, matches regex commands, and appends output objects to the stream.

### Backend Architecture
* **Modular Router**: Mounted in `src/api/v1/routes/index.js` under the `/dev` path using node subpath imports.
* **Controller Handlers**: Resolves database parameters and builds JSON logs containing server events, process statuses, and environment variables.

---

## 2. Complete Working Flow

```mermaid
sequenceDiagram
  autonumber
  actor User as Developer User
  participant FE as React Frontend
  participant BE as Express API
  participant DB as SQLite Database

  User->>FE: Click "Launch Workspace" on Card 8
  FE->>BE: GET /api/v1/dev/metrics
  BE->>DB: Query diagnostic configurations
  DB-->>BE: Returns count metrics
  BE-->>FE: HTTP 200 (JSON active metrics)
  FE-->>User: Render KPI cards & Dev Console
  
  User->>FE: Type command "/logs" in Terminal
  FE->>BE: GET /api/v1/dev/logs
  BE-->>FE: HTTP 200 (JSON diagnostic log stream)
  FE-->>User: Append log streams to terminal output buffer
```

1. **Activation**: Developer enters the template gallery, selects the "Interactive Dev Showcase" template, and clicks "Launch Workspace".
2. **Boot**: `DevDashboard` fires a `useEffect` call targeting `/api/v1/dev/metrics` to request branch and ticket count states.
3. **Shell Initialization**: The terminal loads system logs and sets the input prompt.
4. **Command Loop**: When the user enters an interactive slash command:
   * `/status` / `/metrics`: Returns processed workspace settings.
   * `/logs`: Sends a fetch request to the backend log endpoint `/api/v1/dev/logs` and prints the output array directly into the console.
   * `/clear`: Flushes the stdout buffer array.
