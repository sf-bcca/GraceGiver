# Implementation Plan: Member Self-Registration

This plan outlines the steps to implement a public member registration flow, enabling parishioners to create accounts and link them to their records.

## Phase 1: Backend Registration API [checkpoint: 486e953]
Focus on creating a secure, rate-limited endpoint for account creation.

- [x] Task: Create `/api/register` endpoint [b4fbba3]
    - [x] Implement input validation (Name, Email, Phone).
    - [x] Implement Password Policy enforcement.
    - [x] Add logic to check for existing `users` by email.
    - [x] Add logic to match/create `members` record.
    - [x] Hash password and create `user` with `viewer` role.
- [x] Task: Implement Registration Rate Limiting [b4fbba3]
    - [x] Apply `express-rate-limit` specifically to the register route.
- [x] Task: Verify registration logic with unit tests [b4fbba3]
    - [x] Test matching existing members.
    - [x] Test new member creation.
    - [x] Test validation and policy failures.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Registration API' [486e953]

## Phase 2: Frontend Registration UI [checkpoint: cbc9e68]
Create the user interface and integrate it with the login flow.

- [x] Task: Create `Register` component [cbc9e68]
    - [x] Implement form with validation feedback.
    - [x] Show real-time password strength meter.
- [x] Task: Integrate with `App` and `Login` [cbc9e68]
    - [x] Add "Need an account? Register" link to `Login.tsx`.
    - [x] Add `REGISTER` view to `ViewState` and `App.tsx`.
- [x] Task: Implement Post-Registration Flow [cbc9e68]
    - [x] Auto-login user upon successful registration or redirect to login with a success message.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Registration UI' [cbc9e68]
