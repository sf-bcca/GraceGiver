# Specification: Individual Member Financial Statements with AI Narrative Insights

## Overview
This track implements the capability for church administrators to generate and download personalized financial statements for individual members. These statements will include a comprehensive summary of their giving history for a specified tax year, an itemized list of donations, and an AI-generated narrative insight that summarizes their stewardship and impact.

## User Stories
- **As an Administrator**, I want to generate a tax-compliant PDF statement for a member so that they can use it for their tax filings.
- **As an Administrator**, I want the statement to include a narrative summary of the member's giving trends so that I can provide a personalized and encouraging message.
- **As an Administrator**, I want to be able to preview and download these statements directly from the member directory.

## Functional Requirements
### Backend
- **Data Retrieval API:** A new endpoint `GET /api/reports/member-statement/:id` that accepts a `year` query parameter. It must return the member's details and all donations for that year.
- **AI Narrative Service:** A service that takes the giving history and uses the Google Gemini SDK to generate a 2-3 sentence "Impact Summary" or "Giving Narrative".
- **PDF Generation Service:** A service using `PDFKit` to generate a branded, professional PDF containing:
    - Church logo and address.
    - Member's name and address.
    - Total contributions for the year.
    - Table of itemized donations (Date, Fund, Amount).
    - The AI-generated narrative insight.
    - IRS required compliance language.

### Frontend
- **Statement Action Button:** A "Generate Statement" button added to the member details view or member list.
- **Statement Modal/Drawer:** A UI component that allows the administrator to:
    - Select the tax year.
    - View a preview of the AI narrative (with an option to refresh/regenerate).
    - Trigger the PDF download.

## Non-Functional Requirements
- **Security:** Ensure that only authorized roles (Manager, Admin, Super Admin) can generate these reports (RBAC).
- **Performance:** AI generation and PDF assembly should happen within a reasonable timeframe (< 5 seconds).
- **Compliance:** The PDF must meet standard IRS requirements for charitable contribution receipts.

## Technical Considerations
- Use the existing `geminiService.js` or create a specific prompt template for member statements.
- Ensure the PDF layout is responsive to different data lengths (e.g., many donations).
