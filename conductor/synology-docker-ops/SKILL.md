---
name: synology-docker-ops
description: Manages Docker deployments on Synology NAS devices using "Container Manager". Use when deploying, debugging, or configuring GraceGiver on a Synology device to handle custom CLI commands and environment quirks.
---

# synology-docker-ops

This skill provides guidance and tools for hosting GraceGiver on Synology hardware.

## Core Workflows

### 1. Verify Synology Environment
If you are troubleshooting a deployment on a Synology device, run the check script:

```bash
bash conductor/synology-docker-ops/scripts/syno_check.sh
```

### 2. Custom Docker Commands
Synology's CLI uses `syno appscenter docker` instead of standard `docker` in some contexts. Consult [references/synology_commands.md](references/synology_commands.md) for the correct syntax for status checks and container management.

### 3. Permission & Reverse Proxy Handling
When configuring volumes or exposing the app to the internet:
- Reference the **Volume Permissions** section in [references/synology_commands.md](references/synology_commands.md) to fix RW issues.
- Use the **Nginx Reverse Proxy** section to coordinate between the project's internal Nginx and Synology's host-level proxy.

## Resource Navigation
- **Command Reference**: [references/synology_commands.md](references/synology_commands.md)
- **Environment Check**: `conductor/synology-docker-ops/scripts/syno_check.sh`