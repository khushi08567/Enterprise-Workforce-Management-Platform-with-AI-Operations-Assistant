# Developer Dashboard Workspace (Interactive Dev Showcase)

This folder contains the complete technical design, system architectures, API parameters, and database schemas for the **Developer Dashboard Workspace** (representing the "Interactive Dev Showcase" template layout).

---

## 1. Purpose and Functionality

The **Developer Dashboard Workspace** acts as the primary operational console for engineers and developers working on the platform. It provides high-visibility dashboards monitoring development KPI metrics alongside a live operational diagnostic terminal, enabling engineers to check system states, view logs, and run diagnostic queries directly from a central interface.

---

## 2. All Submodules

1. **Dashboard Metrics (KPI Module)**:
   * Displays responsive aspect-ratio cards representing:
     * Active Branches count.
     * Commit frequency count.
     * Open Pull Requests.
     * Weekly coding hours.
   * Pulls dynamic data from the backend v1 dev endpoints.

2. **System Diagnostic Console (Terminal Module)**:
   * A simulated UNIX-style shell displaying startup sequences.
   * Parses typing inputs and executes interactive operations such as `/status`, `/metrics`, `/logs`, `/health`, and `/clear` with formatted outputs.

3. **Backend Log Stream Module**:
   * Collects and processes runtime microservice system events (info, warning, success, errors) and exposes them through a secure REST API.

---

## 3. UI Wireframe Layout

The layout is divided into a split interface to ensure balance between analytics and direct command interaction.

```
+---------------------------------------------------------------------------------------+
|  🎨 Select Template Gallery               |               🔐 Full-Stack WFM Auth Demo |
+---------------------------------------------------------------------------------------+
|  Interactive Developer Workspace                                 [← Back to Templates] |
|  Template: Interactive Dev Showcase                                                   |
+---------------------------------------------------------------------------------------+
|                                           |                                           |
|  [ DEVELOPMENT KPIs ]                     |  [ SYSTEM DIAGNOSTIC SHELL ]              |
|                                           |  +-------------------------------------+  |
|  +-------------------+-----------------+  |  |  ● ● ●       antigravity@wfm-shell: |  |
|  | ACTIVE BRANCHES   | COMMITS COUNT   |  |  +-------------------------------------+  |
|  |       4           |       284       |  |  | SYSTEM: Shell initialized.          |  |
|  +-------------------+-----------------+  |  | SYSTEM: Database Connected.         |  |
|  | OPEN PULL REQ.    | CODING HOURS    |  |  |                                     |  |
|  |       2           |      38.5h      |  |  |                                     |  |
|  +-------------------+-----------------+  |  |                                     |  |
|                                           |  |                                     |  |
|  +-------------------------------------+  |  |                                     |  |
|  | DEPLOYMENT STATUS                   |  |  +-------------------------------------+  |
|  | Production Build v1.2.4 Active      |  |  | antigravity@wfm:~$ /help            |  |
|  +-------------------------------------+  |  +-------------------------------------+  |
|                                           |                                           |
+---------------------------------------------------------------------------------------+
```
