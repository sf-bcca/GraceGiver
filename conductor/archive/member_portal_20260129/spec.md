# Specification: Member Self-Service Portal (Simplified)

## Overview
The Member Self-Service Portal is a dedicated, simplified interface designed for users with the `viewer` role. It empowers church members to manage their own information, track their financial contributions, and engage with ministry opportunities without requiring administrative assistance.

## User Persona
- **Church Member (Role: `viewer`):** A regular parishioner who wants to view their giving history, download tax statements, and keep their profile/skills up to date.

## Functional Requirements

### 1. Simplified Dashboard (Landing Page)
- **Immediate Access:** Users with the `viewer` role are directed to this simplified dashboard immediately upon login.
- **Top-Level Stats:**
    - **Giving Summary:** A "Total Given This Year" summary or progress bar.
    - **Volunteer Status:** Display of active volunteer roles or matched opportunities from the ServantHeart system.
    - **Profile Completeness:** A visual indicator showing how much of their profile (contact info + skills) is complete.
    - **Recent Activity:** A list showing the last 3-5 donations.

### 2. Personal Information Management
- **Contact Updates:** Ability to update email, phone number, and physical address.
- **Immediate Persistence:** Changes to contact information are saved directly to the database.
- **Skill Management:** Ability to add, remove, or update skills and interests for the ServantHeart volunteer matching system.

### 3. Financial Stewardship
- **Donation History:** A comprehensive view of all personal donations.
- **Tax Statements:** A list of available PDF tax statements for the current and previous years (last 3-5 years) for direct download.

### 4. Account Security
- **Password Management:** Ability for members to change their password within the portal.

## Non-Functional Requirements
- **Security:** Ensure that users with the `viewer` role can *only* access their own data.
- **Responsibility:** The interface must be mobile-friendly, as members are likely to access it from smartphones.
- **Simplicity:** The UI should be significantly cleaner and less complex than the administrative dashboard.

## Acceptance Criteria
- [ ] Users with the `viewer` role are automatically redirected to the Member Dashboard on login.
- [ ] Members can see their own donation history but not the history of any other member.
- [ ] Updates to contact info and skills are reflected immediately in the administrative `Member Directory`.
- [ ] PDF statements are generated and downloaded correctly for the selected year.
- [ ] The dashboard displays all four requested "quick stats" correctly based on real-time data.

## Out of Scope
- Online giving/payment processing (donations remain recorded manually by admins for now).
- Family/Household management (only individual member profiles are covered).
- Direct communication/messaging with administrators via the portal.
