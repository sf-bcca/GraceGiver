# Plan: Individual Member Financial Statements with AI Narrative Insights

This plan follows the project's TDD workflow: Write Tests (Red) -> Implement (Green) -> Refactor.

## Phase 1: Backend Data & AI Narrative Generation

- [x] Task: Backend - [TDD] Create API endpoint for member giving history [dd93b2a]
    - [ ] Sub-task: Write integration tests for `GET /api/reports/member-statement/:id?year=YYYY` in `server/tests/integration/reports.integration.test.js`
    - [ ] Sub-task: Implement the route and controller in `server/reports.js` and `server/index.js`
- [x] Task: Backend - [TDD] Implement AI Narrative Service for member impact [3725f55]
    - [ ] Sub-task: Write unit tests in `server/tests/geminiService.test.js` for a new `generateMemberNarrative` function
    - [ ] Sub-task: Implement `generateMemberNarrative` in `server/geminiService.js` using giving data context
- [ ] Task: Conductor - User Manual Verification 'Backend Data & AI Narrative Generation' (Protocol in workflow.md)

## Phase 2: PDF Generation & Statement API Completion

- [ ] Task: Backend - [TDD] Implement PDFKit service for member statements
    - [ ] Sub-task: Write unit tests in `server/tests/reports/memberReport.test.js` verifying the PDF structure and content inclusion
    - [ ] Sub-task: Implement the PDF generation logic in `server/reports/memberReport.js`
- [ ] Task: Backend - Finalize statement endpoint with PDF response
    - [ ] Sub-task: Update integration tests to verify PDF content-type and binary data
    - [ ] Sub-task: Integrate the AI narrative and PDF service into the main report endpoint
- [ ] Task: Conductor - User Manual Verification 'PDF Generation & Statement API Completion' (Protocol in workflow.md)

## Phase 3: Frontend Integration & UI

- [ ] Task: Frontend - [TDD] Create Statement Generation Modal component
    - [ ] Sub-task: Write Playwright tests in `tests/e2e/member-statement.spec.ts` for the modal's open/close and year selection
    - [ ] Sub-task: Create `MemberStatementModal.tsx` in `components/`
- [ ] Task: Frontend - Implement Statement Download functionality
    - [ ] Sub-task: Update E2E tests to verify file download trigger
    - [ ] Sub-task: Connect the modal to the backend API and handle the file download stream
- [ ] Task: Conductor - User Manual Verification 'Frontend Integration & UI' (Protocol in workflow.md)
