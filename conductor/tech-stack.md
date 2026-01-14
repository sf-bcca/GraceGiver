# Technology Stack

## Frontend
- **Framework:** React 19 (Vite)
- **Styling/UI:** Tailwind CSS & Lucide Icons
- **State Management:** React Context (for Socket)
- **Data Visualization:** Recharts
- **Real-Time:** Socket.io-client

## Backend
- **Runtime:** Node.js (CommonJS)
- **Framework:** Express 5
- **Database:** PostgreSQL (via `pg`)
- **Real-Time:** Socket.io with Redis Adapter
- **Security:** JWT (jsonwebtoken), bcryptjs, express-rate-limit
- **AI Integration:** Google Gemini SDK (@google/genai)
- **File Generation:** PDFKit (for IRS statements), CSV

## Infrastructure & Tooling
- **Containerization:** Docker & Docker Compose
- **Testing:** Vitest (Backend/Integration), Playwright (E2E)
- **Language:** TypeScript (Frontend), JavaScript (Backend)
- **CI/CD:** GitHub Actions (Automated Deployment to Synology NAS)
- **Linting:** SecretLint, Husky
