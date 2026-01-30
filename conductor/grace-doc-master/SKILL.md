---
name: grace-doc-master
description: Synchronizes technical documentation with code changes in GraceGiver. Use when adding new API routes, modifying the database schema, or updating project specifications to prevent documentation drift.
---

# grace-doc-master

This skill ensures that GraceGiver's documentation remains the authoritative source of truth.

## Core Workflows

### 1. Detect Documentation Drift
When finishing a feature, verify that all new API routes have been documented:

```bash
node conductor/grace-doc-master/scripts/check_doc_drift.cjs
```

### 2. Update Documentation Manifest
Consult the [references/doc_manifest.md](references/doc_manifest.md) to identify which files need updating based on your code changes (API, Database, Security, etc.).

### 3. Maintain Specifications
Follow the [references/update_workflow.md](references/update_workflow.md) to ensure that `conductor/` tracks and implementation plans are kept in sync with the actual codebase status.

## Resource Navigation
- **Doc Manifest**: [references/doc_manifest.md](references/doc_manifest.md)
- **Update Workflow**: [references/update_workflow.md](references/update_workflow.md)
- **Drift Checker**: `conductor/grace-doc-master/scripts/check_doc_drift.cjs`