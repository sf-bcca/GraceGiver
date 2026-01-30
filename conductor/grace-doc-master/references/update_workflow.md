# Documentation Update Workflow

Follow these steps to ensure documentation remains accurate during development.

## 1. Feature Inception
- When starting a new track, update `conductor/tracks.md`.
- Create a `plan.md` and `spec.md` for the track.

## 2. Implementation Phase
- **Database**: If schema changes, update `db/init.sql` alongside the migration.
- **API**: If adding/modifying routes, immediately add them to `docs/API_REFERENCE.md`.
- **Validation**: If adding a new `ERROR_CODE`, add it to `docs/ERROR_CODES.md`.

## 3. Verification Phase
- Run the drift checker:
  ```bash
  node conductor/grace-doc-master/scripts/check_doc_drift.cjs
  ```
- Use the `pii-guardian` audit to ensure sensitive documentation doesn't leak internal secrets.

## 4. Finalization
- Before closing a task, ensure the `README.md` is updated if there are new installation steps or environment variables.
