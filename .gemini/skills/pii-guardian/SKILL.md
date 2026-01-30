---
name: pii-guardian
description: Enforces data privacy and security standards for GraceGiver. Use when handling member PII, financial data, or sensitive logs to ensure compliance with the project's sanitization and validation rules.
---

# pii-guardian

This skill ensures that GraceGiver handles sensitive church data with the highest level of security and privacy.

## Core Workflows

### 1. Privacy Review
Before committing changes to the API or Frontend, run the privacy audit to ensure no sensitive data is leaked in logs:

```bash
node conductor/pii-guardian/scripts/audit_pii.cjs
```

### 2. Implement Validation
When creating new forms or endpoints, ensure they use the central validation logic in `server/validation.js`. Use the snippets in [assets/validation_snippets.js](assets/validation_snippets.js) for common tasks like masking and sanitization.

### 3. Standards Compliance
Consult [references/pii_standards.md](references/pii_standards.md) to verify if new data points are considered PII/SPI and follow the mandated handling procedures.

## Resource Navigation
- **Privacy Standards**: [references/pii_standards.md](references/pii_standards.md)
- **Validation Snippets**: [assets/validation_snippets.js](assets/validation_snippets.js)
- **Audit Script**: `conductor/pii-guardian/scripts/audit_pii.cjs`