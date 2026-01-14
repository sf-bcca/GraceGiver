# GraceGiver Project Context

## Overview
GraceGiver is a secure church management platform designed for donation tracking, member directory management, and financial reporting. It is a full-stack application utilizing a React frontend and a Node.js/Express backend, containerized with Docker.

## Architecture & Tech Stack

### Frontend
*   **Framework:** React 19 (Vite)
*   **Language:** TypeScript
*   **Styling:** CSS (likely Tailwind or standard CSS modules - check specific component usage)
*   **Key Libraries:**
    *   `recharts`: For financial charts.
    *   `lucide-react`: For icons.
    *   `socket.io-client`: For real-time features.
    *   `@google/genai`: For AI integration.

### Backend (`/server`)
*   **Framework:** Express.js
*   **Language:** JavaScript (CommonJS) / Node.js
*   **Database:** PostgreSQL (using `pg` driver)
*   **Real-time:** Socket.IO with Redis Adapter
*   **Key Libraries:**
    *   `pdfkit`: For generating PDF reports.
    *   `bcryptjs`, `jsonwebtoken`: For auth.
    *   `csv`, `csv-stringify`: For data exports.

### Infrastructure
*   **Docker:** Used for full-stack deployment (`db`, `api`, `redis`, `app`).
*   **Database:** PostgreSQL 17 (Service: `db`, Port: 5433:5432).
*   **Cache/PubSub:** Redis (Service: `redis`, Port: 6379).
*   **Reverse Proxy:** Nginx (Service: `app` uses Nginx to serve static files in production/docker).

## Development Setup

### Prerequisites
*   Node.js (v20+)
*   Docker & Docker Compose
*   PostgreSQL (if running locally without Docker)

### Installation
1.  **Root Dependencies:**
    ```bash
    npm install
    ```
2.  **Server Dependencies:**
    ```bash
    cd server
    npm install
    ```
3.  **Environment Variables:**
    *   Copy `.env.example` to `.env`.
    *   Configure `VITE_GEMINI_API_KEY`, `DB_PASSWORD`, `JWT_SECRET`, etc.

### Running the Application

*   **Development Mode (Concurrent Frontend & Backend):**
    ```bash
    npm run dev
    ```
    *   This runs `vite` and `node server/index.js` concurrently.
    *   Frontend: `http://localhost:5173` (typically)
    *   Backend: `http://localhost:3000`

*   **Docker (Production-like):**
    ```bash
    docker-compose up --build
    ```
    *   App: `http://localhost:8085`
    *   API: `http://localhost:3001`

### Testing

*   **E2E Tests (Playwright):**
    ```bash
    npm run test:e2e
    ```
*   **Backend Unit Tests (Vitest):**
    ```bash
    cd server
    npm test
    ```
*   **Backend Integration Tests:**
    ```bash
    cd server
    npm run test:integration
    ```

## Project Structure
*   `src/`: Frontend source code (React components, hooks, contexts).
*   `server/`: Backend source code (API routes, database logic).
    *   `server/tests/`: Backend tests.
*   `db/`: Database initialization scripts and migrations.
*   `tests/e2e/`: Playwright E2E tests.
*   `docs/`: Additional documentation (API, Error Codes, WebSocket).

## Conventions
*   **Version Control:** Trunk-based development.
*   **Linting:** Husky pre-commit hooks + SecretLint.
*   **Database:** Migrations are manually managed in `db/migrations/`.
*   **API:** RESTful API with some WebSocket endpoints for real-time updates.
