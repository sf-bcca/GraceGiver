<div align="center">
<img width="150" height="150" alt="GraceGiver Logo" src="public/favicon.png">

# GraceGiver | Secure Church Management & Donation Tracking

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/your-repo/gracegiver/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](CONTRIBUTING.md)

</div>

GraceGiver is a premium, secure, and intuitive church management platform designed to streamline donation tracking, member directory management, and financial reporting. Built with a focus on security and ease of use, it empowers church administrators to focus on their mission while handling the complexities of financial stewardship with confidence.

---

## 🚀 Features

- **Dashboard:** Real-time visibility into totals, fund distribution, and **historical growth metrics** (MoM and weekly trends).
- **Member Directory:** Comprehensive management of church members with contact details and giving history.
- **Donation Entry:** Fast and secure recording of contributions across multiple funds (General, Building, Missions, etc.).
- **Advanced Reporting:** Three-phased reporting suite including IRS-compliant PDF statements, CSV exports, operational health reports, and financial intelligence charts (powered by Recharts).
- **AI Financial Insights:** Secure integration with Gemini AI for advanced narrative analysis of giving trends and financial health (backend-processed for security).

- **Enterprise Security:**
  - 🔐 JWT-based authentication with configurable expiry
  - 🛡️ 6-tier Role-Based Access Control (RBAC)
  - 🔒 Account lockout after failed login attempts
  - 📋 Password policy enforcement with strength meter
  - 👤 Full user management UI (admin only)
- **GraceForecast:** Predictive retention engine that identifies at-risk donors using AI-powered "Nudge" interventions.
- **ServantHeart:** Volunteer and talent matching system that connects member skills to ministry needs using GraceAI.
- **CommunityBridge:** Transparent stewardship portals that visualize progress toward specific financial goals and mission milestones.
- **Docker Ready:** Containerized architecture for seamless deployment and scalability.

---

## 🛠️ Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v20+ recommended)
- `npm` or `yarn`

### Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/sf-bcca/GraceGiver.git
   cd GraceGiver
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory by copying the example file:

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and add your Gemini API key:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start with Docker (Recommended):**

   ```bash
   docker-compose up --build
   ```

   Access the application at [http://localhost:8085](http://localhost:8085).

4. **Local Development (Manual):**
   - **Frontend:**
     ```bash
     npm install
     npm run dev
     ```
   - **Backend:**
     Ensure you have a PostgreSQL database running. Update your `.env` file with the following database credentials (see `.env.example`):
     ```bash
     cd server
     npm install
     node index.js
     ```

---

## 📖 Usage

### Entering Donations

1. Navigate to the **Donations** tab.
2. Select a member or search for a name.
3. Enter the amount, select the fund, and add optional notes.
4. Click **Record Donation** to save securely.

### Generating Reports

- **Compliance:** Generate batch IRS-compliant PDF statements for any tax year.
- **Operational Health:** Access "Quick Reports" for missing emails (with inline editing) and new donor lists.
- **Financial Intelligence:** View interactive Pie, Line, and Bar charts for fund distribution, quarterly progress, and 3-year trends.
- **AI Insights:** Use the AI button to generate a narrative summary of financial health.

---

## 🔌 API Reference

The backend API runs on port `3000` internally. When running via Docker Compose, it is mapped to host port `3001` to avoid conflicts.

| Endpoint                     | Method       | Description                    | Auth Required      |
| :--------------------------- | :----------- | :----------------------------- | :----------------- |
| `/api/login`                 | `POST`       | Authenticate user, returns JWT | No                 |
| `/api/users/change-password` | `POST`       | Change own password            | Yes                |
| `/api/auth/password-policy`  | `GET`        | Get password requirements      | No                 |
| `/api/members`               | `GET`        | Retrieve all members           | Yes                |
| `/api/members`               | `POST`       | Create a new member            | Yes (data_entry+)  |
| `/api/donations`             | `GET`        | Retrieve recent donations      | Yes                |
| `/api/donations`             | `POST`       | Record a new donation          | Yes (data_entry+)  |
| `/api/users`                 | `GET`        | List all users                 | Yes (admin+)       |
| `/api/users`                 | `POST`       | Create new user                | Yes (admin+)       |
| `/api/users/:id`             | `PUT/DELETE` | Update or delete user          | Yes (admin+)       |
| `/api/users/:id/unlock`      | `POST`       | Unlock account                 | Yes (admin+)       |
| `/api/roles`                 | `GET`        | Get assignable roles           | Yes                |
| `/api/forecast/at-risk`      | `GET`        | Get at-risk donors summary     | Yes (reports:read) |
| `/api/opportunities`         | `GET/POST`   | List/Create ministry roles     | Yes                |
| `/api/stewardship/campaigns` | `GET/POST`   | Manage Stewardship goals       | Yes                |
| `/api/reports/*`             | `GET`        | PDF, CSV, and Chart data       | Yes (manager+)     |

### Role Hierarchy

| Role          | Permissions                                 |
| :------------ | :------------------------------------------ |
| `super_admin` | Full system access, cannot be deleted       |
| `admin`       | User management + all data operations       |
| `manager`     | Reports + member/donation management        |
| `auditor`     | Global read-only access to all data         |
| `data_entry`  | Create/edit members and donations           |
| `viewer`      | **Self-Service**: Personal read access only |

---

## 🤝 Contributing

We welcome contributions from the community! Please follow these steps:

1. **Fork** the repository.
2. **Create a branch** for your feature or bugfix (`git checkout -b feature/amazing-feature`).
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`).
4. **Push** to the branch (`git push origin feature/amazing-feature`).
5. **Open a Pull Request**.

### Coding Standards

- We use **TypeScript** for both frontend and backend.
- Code linting is enforced via **Husky** and **SecretLint**. Ensure all pre-commit hooks pass.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Issues:** Report bugs or request features via [GitHub Issues](https://github.com/your-repo/gracegiver/issues).
- **Email:** Contact the maintainers at [shedrick@shedrickflowers.com](mailto:shedrick@shedrickflowers.com).

---

## 🙏 Acknowledgments

- Inspired by the mission of [Mt. Herman A.M.E. Church](http://mthermaname.org).
- Powered by [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Node.js](https://nodejs.org/), and [PostgreSQL](https://www.postgresql.org/).
- AI insights driven by [Google Gemini SDK](https://ai.google.dev/).
