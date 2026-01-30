# GraceGiver Documentation Manifest

This manifest tracks the "Sources of Truth" for various parts of the project. If you modify code related to these areas, you MUST update the corresponding documentation.

## 1. API & Endpoints
- **Source of Truth**: `docs/API_REFERENCE.md`
- **Secondary**: `server/index.js` (Route definitions)
- **Action**: Use `scripts/check_doc_drift.cjs` to verify coverage.

## 2. Database Schema
- **Source of Truth**: `db/init.sql`
- **Secondary**: `db/migrations/`
- **Action**: Use the `grace-database-steward` skill to sync changes.

## 3. Security & Validation
- **Source of Truth**: `docs/ERROR_CODES.md`
- **Secondary**: `server/validation.js` and `server/passwordPolicy.js`
- **Action**: Update error codes when adding new validation rules.

## 4. Architectural Specs
- **Source of Truth**: `conductor/product.md` and `conductor/tech-stack.md`
- **Secondary**: `AGENTS.md`
- **Action**: Update when introducing new major dependencies or sub-agents.

## 5. Deployment
- **Source of Truth**: `README.md` and `conductor/synology-docker-ops/`
- **Secondary**: `docker-compose.yml`
