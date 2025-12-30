# GraceGiver Error Codes Reference

> Complete reference for all structured error codes returned by the API.

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": ["Optional array of specific issues"],
  "required": "permission_name (if applicable)",
  "role": "current_user_role (if applicable)"
}
```

---

## Authentication Errors

| Code             | HTTP | Description                    | Resolution                                           |
| ---------------- | ---- | ------------------------------ | ---------------------------------------------------- |
| `AUTH_REQUIRED`  | 401  | No token or invalid token      | Include valid JWT in `Authorization: Bearer <token>` |
| `ACCOUNT_LOCKED` | 423  | Too many failed login attempts | Wait for lockout to expire (default: 15 min)         |

---

## Password Policy Errors

| Code               | HTTP | Description                        | Resolution                                  |
| ------------------ | ---- | ---------------------------------- | ------------------------------------------- |
| `POLICY_VIOLATION` | 400  | Password doesn't meet requirements | See `details` array for specific violations |
| `PASSWORD_REUSE`   | 400  | Cannot reuse recent passwords      | Choose a password not used in last 5        |

### Password Policy Violation Details

```json
{
  "error": "Password policy violation",
  "code": "POLICY_VIOLATION",
  "details": [
    "Password must be at least 12 characters",
    "Must contain uppercase letter",
    "Must contain lowercase letter",
    "Must contain a digit",
    "Must contain special character"
  ]
}
```

---

## Authorization Errors (RBAC)

| Code                     | HTTP | Description                         | Resolution                                 |
| ------------------------ | ---- | ----------------------------------- | ------------------------------------------ |
| `FORBIDDEN`              | 403  | Insufficient permissions            | User role lacks required permission        |
| `ROLE_ESCALATION`        | 403  | Cannot assign higher role           | Admins cannot promote users to super_admin |
| `INSUFFICIENT_PRIVILEGE` | 403  | Cannot modify user with higher role | Target user has equal or higher role       |
| `SELF_MODIFICATION`      | 403  | Cannot change own role/username     | Use account settings instead               |
| `SELF_DELETION`          | 403  | Cannot delete own account           | Another admin must perform deletion        |
| `PROTECTED_ACCOUNT`      | 403  | Cannot delete super_admin           | Super admin accounts cannot be deleted     |

---

## Data Validation Errors

Returned when member data fails validation in `server/validation.js`:

| Code                   | HTTP | Field      | Rule                                                      |
| ---------------------- | ---- | ---------- | --------------------------------------------------------- |
| `INVALID_EMAIL`        | 400  | email      | Must be valid RFC 5322 format                             |
| `INVALID_EMAIL_LENGTH` | 400  | email      | Cannot exceed 254 characters                              |
| `INVALID_TELEPHONE`    | 400  | telephone  | Must be E.164 format (e.g., `+14155552671`)               |
| `INVALID_ZIP`          | 400  | zip        | Must be 5 digits or ZIP+4 (e.g., `12345` or `12345-6789`) |
| `INVALID_STATE`        | 400  | state      | Must be 2-letter uppercase (e.g., `CA`, `NY`)             |
| `REQUIRED_FIRST_NAME`  | 400  | firstName  | Cannot be empty                                           |
| `REQUIRED_LAST_NAME`   | 400  | lastName   | Cannot be empty                                           |
| `VALIDATION_FAILED`    | 400  | (multiple) | See `details` array                                       |

### Example Validation Error Response

```json
{
  "error": "VALIDATION_FAILED",
  "details": [
    "INVALID_EMAIL: Must be a valid RFC 5322 email address.",
    "INVALID_ZIP: Zip code must be 5 digits (12345) or ZIP+4 (12345-6789)."
  ]
}
```

---

## User Management Errors

| Code  | HTTP     | Description             | Resolution                  |
| ----- | -------- | ----------------------- | --------------------------- |
| `409` | Conflict | Username already exists | Choose a different username |

---

## Resource Errors

| Code  | HTTP                  | Description                         |
| ----- | --------------------- | ----------------------------------- |
| `404` | Not Found             | Member, donation, or user not found |
| `400` | Bad Request           | Missing required fields             |
| `500` | Internal Server Error | Unexpected server error             |

---

## Rate Limiting

The export endpoints apply rate limiting:

| Error                    | HTTP | Resolution                      |
| ------------------------ | ---- | ------------------------------- |
| Too many export requests | 429  | Wait 15 minutes before retrying |

---

## Socket.io Errors

When connecting via WebSocket:

| Error                                     | Description                | Resolution                         |
| ----------------------------------------- | -------------------------- | ---------------------------------- |
| `Authentication error: No token provided` | Missing token in handshake | Include `auth.token` in connection |
| `Authentication error: Invalid token`     | JWT verification failed    | Refresh token or re-login          |

---

## Debugging Tips

1. **Check `code` field** — This is the programmatic error identifier
2. **Check `details` array** — For validation errors, this lists all specific issues
3. **Check `required` field** — Shows which permission was needed
4. **Check `role` field** — Shows the user's current role for RBAC debugging
