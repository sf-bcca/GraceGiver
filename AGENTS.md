# AI Agents in GraceGiver

This document outlines the roles, responsibilities, and interaction protocols for the autonomous AI agents integrated into the GraceGiver development ecosystem. As we transition towards an agent-centric development model, clear boundaries and expectations are critical for maintaining system integrity and delivery velocity.

---

## 1. Antigravity (Coding Assistant)

**Purpose/Mandate**
Antigravity is the primary execution agent responsible for high-fidelity code implementation, refactoring, and real-time debugging within the workspace.

- **Key Capabilities/Skills**
  - Full-stack development (TypeScript, React, Node.js).
  - Docker & Docker Compose orchestration.
  - Postgres database management (Self-hosted/SQL).
  - Nginx reverse proxy configuration.
  - Complex codebase navigation and semantic search.
  - Advanced Financial Reporting (IRS Compliance, Operational Health, Financial Intelligence).
  - Integration with Gemini AI SDK for advanced financial analysis.
  - Environment management and secure credential handling.
  - Integration with local development environments and CLI tools.
- **Interaction Protocols/APIs**
  - Directly interacts via the agentic toolset (file I/O, shell execution, browser automation).
- **Expected Inputs and Outputs**
  - **Inputs**: High-level feature requirements, bug reports, or specific implementation tasks.
  - **Outputs**: Functional code changes, comprehensive task summaries, and verification walkthroughs.
- **Ownership/Primary Maintainer**
  - Core Development Team.

---

## 2. Architect (Design & Planning Agent)

**Purpose/Mandate**
The Architect operates at the macro level, ensuring that all implementation details align with the long-term technical vision and system constraints.

- **Key Capabilities/Skills**
  - System design and architectural documentation.
  - Requirement analysis and feasibility studies.
  - Containerized architecture planning and Docker stack optimization.
  - Generation of structured implementation plans and task breakdowns.
  - Cross-component dependency management.
- **Interaction Protocols/APIs**
  - Communicates through `implementation_plan.md` artifacts and high-level design reviews.
- **Expected Inputs and Outputs**
  - **Inputs**: Business objectives, scope definitions, and technical constraints.
  - **Outputs**: Detailed implementation plans, mermaid diagrams, and sequence flows.
- **Ownership/Primary Maintainer**
  - Senior Software Architect.

---

## 3. Linter & Security Agent (Guardians)

**Purpose/Mandate**
These agents provide continuous monitoring and enforcement of code quality, security standards, and credential safety.

- **Key Capabilities/Skills**
  - Secret scanning and sensitive data detection (via SecretLint).
  - Static code analysis and adherence to project style guides.
  - Automated identification of security vulnerabilities in dependencies.
- **Interaction Protocols/APIs**
  - Integrated via Git hooks (Husky) and CI/CD pipelines.
- **Expected Inputs and Outputs**
  - **Inputs**: Staged commits, file changes, and dependency manifests.
  - **Outputs**: Pass/Fail status for pre-commit checks, detailed linting reports.
- **Ownership/Primary Maintainer**
  - DevOps & Security Team.

---

## 4. Test & QA Agent (Verification)

**Purpose/Mandate**
The Test/QA Agent ensures that all changes are verified against the specified requirements and do not introduce regressions.

- **Key Capabilities/Skills**
  - Automated unit, integration, and E2E test generation.
  - Visual regression testing and browser-based verification.
  - Performance monitoring and load testing simulation.
- **Interaction Protocols/APIs**
  - Interacts through the workspace testing framework (Vitest/Jest) and browser automation tools.
- **Expected Inputs and Outputs**
  - **Inputs**: New features, code modifications, and test specifications.
  - **Outputs**: Test execution reports, code coverage metrics, and visual snapshots.
- **Ownership/Primary Maintainer**
  - QA Engineering.

---

## 5. Data Integrity Agent (Validation)

**Purpose/Mandate**
The Data Integrity Agent enforces strict validation rules across all data entry points, ensuring database consistency and preventing malformed data from entering the persistence layer.

- **Key Capabilities/Skills**
  - Regex-based input validation (Email, Phone, Zip Code, State).
  - Real-time input masking and sanitization on the frontend.
  - Server-side validation as the authoritative "last line of defense."
  - Generation and enforcement of data validation standards documentation.
- **Interaction Protocols/APIs**
  - Validation rules defined in `server/validation.js`.
  - Frontend enforcement integrated into React components.
- **Expected Inputs and Outputs**
  - **Inputs**: User-submitted form data (member records, settings).
  - **Outputs**: Validated, sanitized data or structured error responses (400 Bad Request).
- **Ownership/Primary Maintainer**
  - Backend & Data Engineering.

---

## Quick Start: How to Use These Agents

To interact with or trigger these agents, follow these simple protocols:

1. **Antigravity (Coding)**: Simply type your request in the chat interface. For example: _"Add a login page"_ or _"Fix the database connection error"_.
2. **Architect (Planning)**: Ask for a complex feature or a structural change. I will automatically switch to **Architect** mode and present an `implementation_plan.md` for your approval before I start coding.
3. **Linter & Security (Guardians)**: These run automatically. When you run `git commit`, our security agent scans for secrets and linting errors. If it finds any, it will prevent the commit to keep the codebase safe.
4. **Test & QA (Verification)**: After I (Antigravity) finish a task, I will perform verification. You can also explicitly say: _"Verify the latest changes"_ or _"Run the E2E tests"_ to trigger this agent.
5. **Data Integrity (Validation)**: This runs automatically on form submission. The backend will reject any data that doesn't conform to the standards defined in `validation_standards.md`.

---

## General Interaction Guidelines

To ensure harmonious and efficient collaboration between human developers and AI agents, the following best practices must be observed:

1.  **Clear Intent**: Provide unambiguous instructions and context. Agents are only as effective as the clarity of their directive.
2.  **Verification is Mandatory**: All AI-generated code and plans must undergo human review and automated verification.
3.  **Artifact Stewardship**: Maintain `task.md` and `implementation_plan.md` as living documents. They serve as the source of truth for agent state.
4.  **Least Privilege**: Agents should only be granted the permissions necessary to fulfill their specific mandate.

---

## 6. Technical Reference & System Implementation

This section details the concrete implementation of the core systems, serving as a reference for Developers and Agents.

### Authentication

- **Mechanism**: JWT (JSON Web Tokens) via `server/auth.js`.
- **Credentials**:
  - Default Admin User: `admin`
  - Default Password: `admin123` (defined in `db/init.sql`)
- **Flow**:
  1. Client POSTs credentials to `/api/login`.
  2. Server verifies against `users` table (bcrypt hash).
  3. Server issues JWT (24h expiry).
  4. Client stores token in `localStorage` and sends `Authorization: Bearer <token>` header.

### Database Schema

The system uses PostgreSQL with the following core entities (`db/init.sql`):

- **Users**: Admin access management (`username`, `password_hash`, `role`).
- **Members**: Parishioner records.
  - Columns: `id` (text), `first_name` (text), `last_name` (text), `email` (text), `address` (text), `city` (text), `state` (text), `zip` (text), `family_id` (text), `created_at` (timestamptz).
- **Donations**: Financial records linked to Members.
  - Columns: `id` (serial), `member_id` (text), `amount` (numeric), `fund` (text), `notes` (text), `entered_by` (text), `donation_date` (timestamptz).
  - _Cascade Delete_: Deleting a Member automatically deletes their Donations.
  - _Indexes_: `donation_date`, `fund`, `member_id`.

### API Structure

RESTful endpoints provided by `server/index.js`:

- **Members**: `GET /api/members` (Paginated), `POST`, `PUT /:id`, `DELETE /:id`.
- **Donations**: `GET /api/donations` (Paginated), `POST`, `PUT /:id`, `DELETE /:id`.
- **Reporting**:
  - `GET /api/reports/statements?year=YYYY`: Batch PDF Annual Statements.
  - `GET /api/reports/export?year=YYYY`: Full Transaction Log (CSV).
  - `GET /api/reports/missing-emails`: Members without email addresses.
  - `GET /api/reports/new-donors`: Last 30-day donor activity.
  - `GET /api/reports/fund-distribution?year=YYYY`: Pie chart data for fund allocation.
  - `GET /api/reports/quarterly-progress?year=YYYY`: Year-over-year quarterly trends.
  - `GET /api/reports/trend-analysis`: 3-year historical bar chart data.
- **Validation**: Enforced via `server/validation.js` before database insertion.

---

## Future Outlook

The GraceGiver agent ecosystem will continue to evolve towards higher autonomy. Future iterations will include self-healing infrastructure agents and proactive performance optimization agents, further reducing the cognitive load on human contributors while maintaining the highest standards of engineering excellence.
