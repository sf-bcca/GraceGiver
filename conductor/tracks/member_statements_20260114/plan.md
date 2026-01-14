# Plan: Individual Member Financial Statements with AI Narrative Insights

This plan follows the project's TDD workflow: Write Tests (Red) -> Implement (Green) -> Refactor.

## Phase 1: Backend Data & AI Narrative Generation [checkpoint: 3da72dc]

- [x] Task: Backend - [TDD] Create API endpoint for member giving history [dd93b2a]
    - [ ] Sub-task: Write integration tests for `GET /api/reports/member-statement/:id?year=YYYY` in `server/tests/integration/reports.integration.test.js`
    - [ ] Sub-task: Implement the route and controller in `server/reports.js` and `server/index.js`
- [x] Task: Backend - [TDD] Implement AI Narrative Service for member impact [3725f55]
    - [ ] Sub-task: Write unit tests in `server/tests/geminiService.test.js` for a new `generateMemberNarrative` function
    - [ ] Sub-task: Implement `generateMemberNarrative` in `server/geminiService.js` using giving data context
- [x] Task: Conductor - User Manual Verification 'Backend Data & AI Narrative Generation' (Protocol in workflow.md) [3da72dc]

## Phase 2: PDF Generation & Statement API Completion [checkpoint: 7daccba]

- [x] Task: Backend - [TDD] Implement PDFKit service for member statements [176b94b]
    - [ ] Sub-task: Write unit tests in `server/tests/reports/memberReport.test.js` verifying the PDF structure and content inclusion
    - [ ] Sub-task: Implement the PDF generation logic in `server/reports/memberReport.js`
- [x] Task: Backend - Finalize statement endpoint with PDF response [176b94b]
    - [ ] Sub-task: Update integration tests to verify PDF content-type and binary data
    - [ ] Sub-task: Integrate the AI narrative and PDF service into the main report endpoint
- [x] Task: Conductor - User Manual Verification 'PDF Generation & Statement API Completion' (Protocol in workflow.md) [7daccba]

## Phase 3: Frontend Integration & UI [checkpoint: 226d049]

- [x] Task: Frontend - [TDD] Create Statement Generation Modal component [740886d]
    - [ ] Sub-task: Write Playwright tests in `tests/e2e/member-statement.spec.ts` for the modal's open/close and year selection
    - [ ] Sub-task: Create `MemberStatementModal.tsx` in `components/`
- [x] Task: Frontend - Implement Statement Download functionality [740886d]
    - [ ] Sub-task: Update E2E tests to verify file download trigger
    - [ ] Sub-task: Connect the modal to the backend API and handle the file download stream
- [x] Task: Conductor - User Manual Verification 'Frontend Integration & UI' (Protocol in workflow.md) [226d049]
