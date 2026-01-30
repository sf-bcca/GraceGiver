# PII & Data Privacy Standards for GraceGiver

GraceGiver handles sensitive member and financial information. This document defines the standards for protecting Personally Identifiable Information (PII) and Sensitive Personal Information (SPI).

## 1. Defining PII in GraceGiver
The following data points are considered PII/SPI:
- **Identity**: Full Name, `member_id`, `family_id`.
- **Contact**: Email Address, Telephone, Physical Address.
- **Financial**: Donation amounts, fund history, annual totals.
- **Security**: Password hashes, JWTs, session tokens.

## 2. Handling Standards

### Input Validation
- All PII must be validated via `server/validation.js` before being stored.
- Use strict regex patterns (e.g., E.164 for phone numbers).

### Logging & Debugging
- **NEVER** log raw PII (emails, names, phone numbers) in production.
- Use masking or redaction for logs: `user: j***@example.com`.
- **NEVER** log financial amounts linked to specific member names in application logs.

### Display & UI
- Mask sensitive fields in the UI when not actively being edited.
- Ensure role-based access control (RBAC) is enforced at the API level (not just UI hiding).

## 3. Storage & Transmission
- Passwords must be hashed with `bcrypt` (work factor 12).
- API communication must be over HTTPS/TLS.
- Data exports (CSV/JSON) must be logged in `export_logs` with the `user_id` and filters used.
