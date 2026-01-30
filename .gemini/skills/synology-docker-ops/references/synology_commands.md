# Synology Docker (Container Manager) Commands

Synology NAS devices use a custom implementation of Docker. While standard `docker` and `docker-compose` commands may work via SSH, they often lack the necessary environment variables or are not in the default PATH.

## Primary Tool
The primary CLI tool for interacting with Synology's Container Manager is:
`syno appscenter docker`

## Common Operations

### Checking Service Status
To see if the Docker service is running:
```bash
syno appscenter status docker
```

### Listing Containers
If the standard `docker ps` fails or is unavailable:
```bash
syno appscenter docker list
```

### Environment Variables
When running scripts via Task Scheduler or SSH, you may need to explicitly source the environment:
```bash
# Example for a shell script
export PATH=$PATH:/usr/local/bin
```

## Volume Permissions
Synology uses a specific UID/GID mapping for its "Docker" shared folder. If containers cannot write to volumes:
1. Ensure the `docker` user (UID 1024 or 1000, check `/etc/passwd`) has RW permissions on the host folder.
2. Use the "Container Manager" UI to verify "Privileged" mode if hardware access (like USB for backup) is required.

## Nginx Reverse Proxy
Synology's built-in Reverse Proxy (found in Control Panel > Login Portal > Advanced) is independent of the Docker containers.
- If using the project's `nginx.conf`, ensure you aren't conflicting with Synology's port 80/443.
- Standard practice: Map Docker to high ports (e.g., 8085, 3001) and use Synology's UI to point `gracegiver.local` to those ports.
