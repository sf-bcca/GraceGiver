# Functional Specification: Individual Member Report

## 1. Overview
The **Individual Member Report** feature allows authorized users to generate a detailed summary for a specific member. This report aggregates demographic data, membership tenure, and donation history into a single view, available as both an interactive UI modal and a downloadable PDF.

## 2. User Stories
*   **As a** Church Administrator,
    **I want to** view a summary of a specific member's engagement and giving,
    **So that** I can have informed conversations during pastoral visits or stewardship reviews.
*   **As a** Data Entry Clerk,
    **I want to** record the date a member joined the church,
    **So that** we can track membership tenure accurately.
*   **As a** Treasurer,
    **I want to** download a PDF report of a member's lifetime giving,
    **So that** I can provide it to them upon request for their personal records.

## 3. Data Requirements

### 3.1. Member Demographics (Existing & New)
*   **Name:** First & Last Name
*   **Contact:** Email, Phone, Address
*   **Family ID:** Link to family unit
*   **Skills & Interests:** Recorded talents
*   **[NEW] Membership Join Date:** The date the individual officially joined.
*   **[CALCULATED] Years of Membership:** Derived from `(Current Date - Join Date)`.

### 3.2. Financial Activity
*   **Lifetime Giving:** Sum of all donations linked to this member.
*   **Last Donation:** Date and Amount of the most recent contribution.
*   **Donation History:** A chronological list of recent donations (e.g., last 20 or last 12 months).

## 4. User Interface Flow

### 4.1. Member Directory
*   **Entry Point:** In the `MemberDirectory` table, each row will have a "View Report" action (icon: `FileText` or `ClipboardList`).
*   **Edit Mode:** The "Add/Edit Member" modal will include a new date picker field for "Date Joined".

### 4.2. Member Report Modal
*   **Header:** Member Name & "Member since [Date] ([X] Years)"
*   **Body:**
    *   **Top Section:** Key Stats Cards (Lifetime Giving, Last Donation).
    *   **Middle Section:** Contact & Skills summary.
    *   **Bottom Section:** Scrollable table of recent donations.
*   **Footer Actions:**
    *   `Close`: Closes the modal.
    *   `Download PDF`: Triggers the backend PDF generation endpoint.

## 5. Acceptance Criteria
1.  **Schema:** `members` table must support a `joined_at` date column.
2.  **Data Entry:** Users can save and update the "Date Joined" for any member.
3.  **Calculation:** "Years of Membership" is calculated correctly (0 if <1 year).
4.  **Report View:** Clicking "View Report" opens a modal with correct data loaded from the backend.
5.  **PDF Export:** Clicking "Download PDF" downloads a formatted PDF file containing the same data as the modal.
6.  **Permissions:** Only users with `members:read` and `donations:read` permissions can view the report.
