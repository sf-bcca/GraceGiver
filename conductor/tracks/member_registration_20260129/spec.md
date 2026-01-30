# Specification: Member Self-Registration

## Overview
The Member Self-Registration system provides a public-facing interface for parishioners to create their own GraceGiver accounts. This feature reduces administrative burden and ensures that members can access their self-service portal immediately upon joining the digital community.

## User Persona
- **New Parishioner:** Someone who is new to the church and wants to join the directory and track their giving.
- **Existing Parishioner (Offline):** A long-time member who is in the physical directory but hasn't accessed the digital portal yet.

## Functional Requirements

### 1. Public Registration Page
- **Accessibility:** Accessible via a "Register" or "Join Us" link on the login page.
- **Fields:**
    - First Name (Required)
    - Last Name (Required)
    - Email Address (Required, Unique for users)
    - Telephone (Optional)
    - Password (Required, must meet policy)
    - Confirm Password (Required)

### 2. Intelligent Member Matching
- **Conflict Resolution:** If the provided email already has a `user` account, the registration is denied with a prompt to "Reset Password".
- **Automatic Linking:** The system searches the `members` table for an existing record with the matching email.
    - **Found:** The new `user` account is automatically linked to the existing `member_id`.
    - **Not Found:** A new `members` record is created, and the `user` is linked to it.

### 3. Security & Validation
- **Validation:** Enforce standard regex validation for email and phone.
- **Password Policy:** Enforce the same 12+ character complexity requirements used throughout the system.
- **Rate Limiting:** Implement strict rate limiting on the registration endpoint to prevent bot creation.
- **Role Assignment:** All self-registered users are assigned the `viewer` role by default.

## Acceptance Criteria
- [ ] A "Register" link appears on the login page.
- [ ] Users can successfully create an account and are immediately logged in or redirected to login.
- [ ] If an existing member (by email) registers, they see their historical donations immediately in the portal.
- [ ] Password policy is strictly enforced during registration.
- [ ] Registration attempts are rate-limited to prevent abuse.

## Out of Scope
- Multi-step email verification (OTP/Link) - will be added in a future security hardening track.
- CAPTCHA implementation.
- Family/Household linking during registration.
