---
name: grace-qa-sentinel
description: Standardizes and automates testing workflows for GraceGiver. Use when adding new features, fixing bugs, or running CI/CD-like checks to ensure full-stack reliability across Vitest and Playwright.
---

# grace-qa-sentinel

This skill ensures that GraceGiver remains robust through automated verification.

## Core Workflows

### 1. Smart Testing
Instead of running the entire suite, use the smart runner to execute tests relevant to your current changes:

```bash
bash conductor/grace-qa-sentinel/scripts/run_smart_tests.sh
```

### 2. Scaffold New Tests
When creating a new module or API endpoint, use the templates in [assets/test_boilerplate.js](assets/test_boilerplate.js) to ensure your tests follow the project's mocking and setup standards.

### 3. Verify Strategy Compliance
Consult the [references/testing_strategy.md](references/testing_strategy.md) to decide whether a change requires a Unit, Integration, or E2E test.

## Resource Navigation
- **Testing Strategy**: [references/testing_strategy.md](references/testing_strategy.md)
- **Boilerplates**: [assets/test_boilerplate.js](assets/test_boilerplate.js)
- **Smart Runner**: `conductor/grace-qa-sentinel/scripts/run_smart_tests.sh`