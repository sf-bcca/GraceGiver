# GraceGiver WebSocket (Socket.io) Reference

> Real-time synchronization and record locking via Socket.io

---

## Overview

GraceGiver uses Socket.io for:

- **Real-time data sync** — Updates push to all connected clients instantly
- **Record locking** — Prevents concurrent editing conflicts
- **Redis-backed** — Scalable across multiple server instances

---

## Connection

### Client Setup

```javascript
import { io } from "socket.io-client";

const socket = io("https://your-server.com", {
  path: "/socket.io",
  auth: {
    token: localStorage.getItem("jwt_token"),
  },
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
  // Handle: "Authentication error: No token provided"
  // Handle: "Authentication error: Invalid token"
});
```

### Server Configuration

Requires Redis for multi-instance deployments:

```env
REDIS_URL=redis://redis:6379
```

> **Note:** If Redis is unavailable, Socket.io falls back to in-memory adapter (single instance only).

---

## Real-Time Data Events

The server emits these events when data changes:

| Event             | Payload                                  | Trigger         |
| ----------------- | ---------------------------------------- | --------------- | ------------------------ | --------------- |
| `member:update`   | `{ type: "CREATE"                        | "UPDATE"        | "DELETE", data: {...} }` | Member CRUD     |
| `donation:update` | `{ type: "CREATE"                        | "UPDATE"        | "DELETE", data: {...} }` | Donation CRUD   |
| `user:update`     | `{ type: "CREATE"                        | "UPDATE"        | "DELETE", data: {...} }` | User management |
| `settings:update` | `{ name, address, phone, email, taxId }` | Settings change |

### Client Listener Example

```javascript
socket.on("member:update", (payload) => {
  switch (payload.type) {
    case "CREATE":
      addMemberToList(payload.data);
      break;
    case "UPDATE":
      updateMemberInList(payload.data);
      break;
    case "DELETE":
      removeMemberFromList(payload.id);
      break;
  }
});

socket.on("donation:update", (payload) => {
  refreshDashboardTotals();
});
```

---

## Record Locking

Prevents two users from editing the same record simultaneously.

### Acquire Lock

```javascript
socket.emit(
  "lock:acquire",
  { resourceType: "member", resourceId: "uuid-here" },
  (response) => {
    if (response.success) {
      // Lock acquired, enable edit mode
      enableEditForm();
    } else {
      // Already locked
      showNotification(`Record locked by ${response.lockedBy}`);
    }
  }
);
```

### Release Lock

```javascript
socket.emit(
  "lock:release",
  { resourceType: "member", resourceId: "uuid-here" },
  (response) => {
    if (response.success) {
      disableEditForm();
    }
  }
);
```

### Check Lock Status

```javascript
socket.emit(
  "lock:check",
  { resourceType: "member", resourceId: "uuid-here" },
  (lock) => {
    if (lock?.isLocked) {
      console.log(`Locked by ${lock.lockedBy} at ${lock.acquiredAt}`);
    }
  }
);
```

### Lock Update Events

Subscribe to lock changes for a specific resource:

```javascript
const memberId = "uuid-here";
socket.on(`lock:update:member:${memberId}`, (status) => {
  if (status.isLocked) {
    showLockBadge(status.lockedBy);
  } else {
    hideLockBadge();
  }
});
```

---

## Lock Behavior

| Aspect                     | Value                           |
| -------------------------- | ------------------------------- |
| TTL                        | 15 minutes                      |
| Auto-release on disconnect | No (relies on TTL)              |
| Same user reconnect        | TTL is refreshed                |
| Storage                    | Redis (key: `lock:{type}:{id}`) |

### Lock Data Structure (Redis)

```json
{
  "userId": 1,
  "username": "admin",
  "acquiredAt": 1704067200000
}
```

---

## Rooms

Clients can join rooms for targeted updates:

```javascript
socket.emit("join_room", "dashboard");
```

> **Note:** Currently room-based targeting is available but not actively used. All events broadcast globally.

---

## Troubleshooting

| Issue                          | Cause                        | Solution                       |
| ------------------------------ | ---------------------------- | ------------------------------ |
| `Authentication error`         | Invalid/expired JWT          | Re-login to get fresh token    |
| No real-time updates           | Redis not connected          | Check `REDIS_URL` in container |
| Lock never releases            | Client crashed               | Lock expires after 15 min TTL  |
| Multiple instances out of sync | Redis adapter not configured | Ensure `REDIS_URL` is set      |

---

## Docker Compose Configuration

```yaml
services:
  api:
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```
