# GraceGiver Testing Strategy

GraceGiver uses a multi-layered testing strategy to ensure reliability, security, and data integrity.

## 1. Unit Tests (Backend)
- **Framework**: Vitest
- **Location**: `server/tests/*.test.js`
- **Focus**: Individual functions, validation logic, and utility classes.
- **Command**: `cd server && npm test`

## 2. Integration Tests (Backend)
- **Framework**: Vitest + Supertest
- **Location**: `server/tests/integration/*.integration.test.js`
- **Focus**: API endpoints, database interactions, and RBAC enforcement.
- **Command**: `cd server && npm run test:integration`

## 3. E2E Tests (Full Stack)
- **Framework**: Playwright
- **Location**: `tests/e2e/*.spec.ts`
- **Focus**: Critical user flows (Login, Donation Entry, Report Generation).
- **Command**: `npm run test:e2e`

## 4. Mocking Standards
- **AI**: Use `setGenAIInstance` in `server/geminiService.js` to inject a mock AI client.
- **Database**: Use a test-specific database or transaction rollbacks if supported.
- **Socket.io**: Use the provided `test_socket_mock.js` in `server/tests/`.

## 5. Security Testing
- **Secret Scanning**: Handled by `husky` and `secretlint` on pre-commit.
- **Audit**: Use `pii-guardian` to scan for privacy leaks in logs.
