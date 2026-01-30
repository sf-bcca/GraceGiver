# Implementation Plan: Member Self-Service Portal (Simplified)

This plan outlines the steps to implement a simplified member self-service portal for users with the `viewer` role, enabling them to manage their profile, view giving history, and download statements.

## Phase 1: API & Security Enhancements [checkpoint: 765128d]
Focus on ensuring the backend securely serves data to the `viewer` role based on their linked `member_id`.

- [x] Task: Extend `/api/members/:id` and `/api/donations` to support self-service access [731e83f]
    - [x] Modify `requireScopedPermission` to ensure `viewer` can access their own record via `member_id` from their JWT.
    - [x] Create `/api/self/profile` endpoint as a convenience alias for the logged-in member's data.
    - [x] Create `/api/self/donations` endpoint to fetch donations for the logged-in member's `member_id`.
- [x] Task: Implement self-service giving statement list [cf9f0b0]
    - [x] Create `/api/self/statements` endpoint to list available years for the member.
    - [x] Ensure existing `/api/reports/statements` logic can be invoked securely by a `viewer` for their own ID.
- [x] Task: Verify security boundaries with unit tests [e3c901c]
    - [x] Write tests ensuring a `viewer` cannot access another member's data via ID manipulation.
    - [x] Write tests for the new `self` endpoints.
- [x] Task: Conductor - User Manual Verification 'Phase 1: API & Security Enhancements' [765128d]

## Phase 2: Frontend Infrastructure & Routing [checkpoint: 4cf9690]
Set up the routing logic and the base layout for the simplified member dashboard.

- [x] Task: Implement Role-Based Redirect Logic [8a2ad54]
    - [x] Update the `Login` component or main `App` entry point to redirect `viewer` roles to `/member-dashboard`.
- [x] Task: Create `MemberDashboard` shell and navigation [310424d]
    - [x] Design a simplified layout that removes administrative sidebars.
    - [x] Implement a basic header with profile/logout options.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Infrastructure & Routing' [4cf9690]

## Phase 3: Dashboard Quick Stats & Activity [checkpoint: ed706ba]
Build the primary landing page components for the member experience.

- [x] Task: Implement Giving Summary & Progress Bar [b9976f4]
    - [x] Create a component to calculate and display "Total Given This Year" against a target (if applicable) or as a simple stat.
- [x] Task: Implement Recent Activity Feed [b308e04]
    - [x] Create a list component to show the 3-5 most recent donations fetched from `/api/self/donations`.
- [x] Task: Implement ServantHeart Volunteer Status [e194eeb]
    - [x] Display active roles or matched opportunities fetched from existing `/api/opportunities` and `/api/opportunities/:id/matches`.
- [x] Task: Implement Profile Completeness Indicator [99d7edb]
    - [x] Create logic to calculate % completeness based on email, telephone, address, and skills fields.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Dashboard Quick Stats & Activity' [ed706ba]

## Phase 4: Profile & Security Management [checkpoint: 8c8ae4c]
Enable members to update their own records and manage their account.

- [x] Task: Build Member Profile Edit Page [d50b9e2]
    - [x] Create forms for updating contact information (Email, Phone, Address).
    - [x] Integrate existing skill management UI from `VolunteerMatching` or `MemberDirectory`.
- [x] Task: Build Password Change Component for Members [314a6df]
    - [x] Re-use/Refactor `PasswordChange.tsx` to fit the member portal's simplified aesthetic.
- [x] Task: Implement Tax Statement Download List [fc1cc2e]
    - [x] Create a UI to list years and trigger PDF downloads using the `/api/self/statements` and report endpoints.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Profile & Security Management' [8c8ae4c]
