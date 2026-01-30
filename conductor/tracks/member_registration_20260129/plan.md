# Implementation Plan: Member Self-Registration

This plan outlines the steps to implement a public member registration flow, enabling parishioners to create accounts and link them to their records.

## Phase 1: Backend Registration API
Focus on creating a secure, rate-limited endpoint for account creation.

- [ ] Task: Create `/api/register` endpoint
    - [ ] Implement input validation (Name, Email, Phone).
    - [ ] Implement Password Policy enforcement.
    - [ ] Add logic to check for existing `users` by email.
    - [ ] Add logic to match/create `members` record.
    - [ ] Hash password and create `user` with `viewer` role.
- [ ] Task: Implement Registration Rate Limiting
    - [ ] Apply `express-rate-limit` specifically to the register route.
- [ ] Task: Verify registration logic with unit tests
    - [ ] Test matching existing members.
    - [ ] Test new member creation.
    - [ ] Test validation and policy failures.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Registration API' (Protocol in workflow.md)

## Phase 2: Frontend Registration UI
Create the user interface and integrate it with the login flow.

- [ ] Task: Create `Register` component
    - [ ] Implement form with validation feedback.
    - [ ] Show real-time password strength meter.
- [ ] Task: Integrate with `App` and `Login`
    - [ ] Add "Need an account? Register" link to `Login.tsx`.
    - [ ] Add `REGISTER` view to `ViewState` and `App.tsx`.
- [ ] Task: Implement Post-Registration Flow
    - [ ] Auto-login user upon successful registration or redirect to login with a success message.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Registration UI' (Protocol in workflow.md)
