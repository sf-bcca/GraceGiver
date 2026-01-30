# GraceGiver API Reference

> Complete REST API documentation for GraceGiver v1.0

---

## Base URL

| Environment      | URL                           |
| ---------------- | ----------------------------- |
| Docker (default) | `http://localhost:3001/api`   |
| Local dev        | `http://localhost:3000/api`   |
| Production       | `https://your-domain.com/api` |

---

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer <JWT_TOKEN>
```

### Obtain Token

**`POST /api/login`** — Authenticate and receive JWT

**Request Body:**

```json
{
  "username": "admin",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "permissions": ["members:read", "members:create", ...],
    "canManageUsers": true,
    "canExportData": true
  },
  "mustChangePassword": false,
  "passwordExpiry": { "daysRemaining": 85, "expired": false }
}
```

**Error Responses:**

| Code | Error               | Resolution                                  |
| ---- | ------------------- | ------------------------------------------- |
| 401  | Invalid credentials | Verify username/password                    |
| 423  | ACCOUNT_LOCKED      | Wait for lockout to expire (15 min default) |

---

### Password Management

**`POST /api/users/change-password`** — Change own password

| Auth     | Body                                                 |
| -------- | ---------------------------------------------------- |
| Required | `{ "currentPassword": "...", "newPassword": "..." }` |

**`GET /api/auth/password-policy`** — Get password requirements (public)

**`POST /api/auth/validate-password`** — Validate password strength (public)

---

## Members

### List Members

**`GET /api/members`**

| Auth     | Permission     | Query Params              |
| -------- | -------------- | ------------------------- |
| Required | `members:read` | `page`, `limit`, `search` |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid-here",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "telephone": "+14155551234",
      "address": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "familyId": null,
      "joinedAt": "2024-01-15T00:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": { "total": 150, "page": 1, "limit": 50, "totalPages": 3 }
}
```

### Get Single Member

**`GET /api/members/:id`** — Permission: `members:read`

### Create Member

**`POST /api/members`** — Permission: `members:create`

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "telephone": "+14155551234",
  "address": "456 Oak Ave",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "joinedAt": "2024-06-01"
}
```

### Update Member

**`PUT /api/members/:id`** — Permission: `members:update`

### Delete Member

**`DELETE /api/members/:id`** — Permission: `members:delete`

> **Note:** Deletes cascade to donations (all member donations are also deleted).

### Member Skills (ServantHeart)

**`GET /api/members/:id/skills`** — Get skills/interests  
**`PUT /api/members/:id/skills`** — Update skills/interests

**Request Body:**

```json
{ "skills": ["teaching", "music"], "interests": ["youth", "outreach"] }
```

### Individual Member Reports

**`GET /api/members/:id/report`** — Get member report (JSON)  
**`GET /api/members/:id/report/pdf`** — Download member report (PDF)

Returns lifetime giving, donation history, and membership tenure.

**`GET /api/reports/member-statement/:id`** — Detailed annual statement

| Permission     | Query Params             |
| -------------- | ------------------------ |
| `reports:read` | `year` (req), `format`   |

**`GET /api/reports/member-narrative/:id`** — AI stewardship narrative

| Permission     | Query Params |
| -------------- | ------------ |
| `reports:read` | `year` (req) |

---

## Donations

### List Donations

**`GET /api/donations`**

| Auth     | Permission       | Query Params    |
| -------- | ---------------- | --------------- |
| Required | `donations:read` | `page`, `limit` |

### Get Single Donation

**`GET /api/donations/:id`** — Permission: `donations:read`

### Get Donation Summary (Dashboard)

**`GET /api/donations/summary`** — Permission: `donations:read`

**Response:**

```json
{
  "totalDonations": 125000.0,
  "donationCount": 450,
  "donorCount": 85,
  "avgDonation": 277.78,
  "totalMembers": 120,
  "newMembersThisWeek": 3,
  "currentMonthDonations": 8500.0,
  "lastMonthDonations": 7200.0,
  "avgRecent": 285.5,
  "avgPrevious": 260.0
}
```

### Create Donation

**`POST /api/donations`** — Permission: `donations:create`

**Request Body:**

```json
{
  "memberId": "member-uuid",
  "amount": 100.0,
  "fund": "General",
  "notes": "Weekly tithe",
  "enteredBy": "admin"
}
```

### Update Donation

**`PUT /api/donations/:id`** — Permission: `donations:update`

### Delete Donation

**`DELETE /api/donations/:id`** — Permission: `donations:delete`

---

## Reports

All report endpoints require `reports:read` or `reports:export` permission.

| Endpoint                                    | Method | Description               | Permission       |
| ------------------------------------------- | ------ | ------------------------- | ---------------- |
| `/api/reports/statements?year=YYYY`         | GET    | Batch PDF statements      | `reports:export` |
| `/api/reports/export?year=YYYY`             | GET    | CSV transaction export    | `reports:export` |
| `/api/reports/missing-emails`               | GET    | Members without email     | `reports:read`   |
| `/api/reports/new-donors`                   | GET    | New donors (30 days)      | `reports:read`   |
| `/api/reports/fund-distribution?year=YYYY`  | GET    | Fund allocation pie chart | `reports:read`   |
| `/api/reports/quarterly-progress?year=YYYY` | GET    | Quarterly totals          | `reports:read`   |
| `/api/reports/trend-analysis`               | GET    | 3-year trend data         | `reports:read`   |

### Data Export

**`GET /api/export/donations`** — Export donations (CSV/JSON)

| Query Param | Type   | Description                      |
| ----------- | ------ | -------------------------------- |
| `format`    | string | `csv` or `json` (default: `csv`) |
| `startDate` | date   | Filter start (YYYY-MM-DD)        |
| `endDate`   | date   | Filter end (YYYY-MM-DD)          |
| `fund`      | string | Filter by fund name              |

**`GET /api/export/members`** — Export member list (CSV/JSON)

> **Rate Limit:** 10 requests per 15 minutes

---

## User Management

All user endpoints require `users:read` or `users:write` permission.

| Endpoint                        | Method | Description          | Permission     |
| ------------------------------- | ------ | -------------------- | -------------- |
| `/api/users`                    | GET    | List all users       | `users:read`   |
| `/api/users`                    | POST   | Create user          | `users:write`  |
| `/api/users/:id`                | PUT    | Update user          | `users:write`  |
| `/api/users/:id`                | DELETE | Delete user          | `users:delete` |
| `/api/users/:id/unlock`         | POST   | Unlock account       | `users:write`  |
| `/api/users/:id/reset-password` | POST   | Force password reset | `users:write`  |
| `/api/roles`                    | GET    | Get assignable roles | `users:read`   |

### Create User

**Request Body:**

```json
{
  "username": "newuser",
  "password": "SecurePass123!",
  "role": "data_entry",
  "email": "user@example.com",
  "memberId": "optional-member-uuid"
}
```

---

## Settings

**`GET /api/settings`** — Get church settings (public)

**`PUT /api/settings`** — Update settings (requires `settings:write`)

**Request Body:**

```json
{
  "name": "First Baptist Church",
  "address": "123 Church St, Springfield, IL 62701",
  "phone": "(555) 123-4567",
  "email": "office@church.org",
  "taxId": "12-3456789"
}
```

---

## AI & Intelligence

**`POST /api/ai/stewardship-insight`** — Get AI financial analysis

| Permission     | Body                                       |
| -------------- | ------------------------------------------ |
| `reports:read` | `{ "donations": [...], "members": [...] }` |

**`GET /api/forecast/at-risk`** — Get at-risk donor predictions

---

## ServantHeart (Volunteers)

**`GET /api/opportunities`** — List ministry opportunities  
**`POST /api/opportunities`** — Create opportunity  
**`GET /api/opportunities/:id/matches`** — AI-powered volunteer matching

---

## CommunityBridge (Campaigns)

**`GET /api/stewardship/campaigns`** — List active campaigns  
**`POST /api/stewardship/campaigns`** — Create campaign

**Request Body:**

```json
{
  "fundName": "Building",
  "title": "New Sanctuary Fund",
  "description": "...",
  "goalAmount": 50000,
  "endDate": "2025-12-31"
}
```

---

## Role-Based Access Control (RBAC)

| Role          | Level | Key Permissions                     |
| ------------- | ----- | ----------------------------------- |
| `super_admin` | 100   | Full access (`*`)                   |
| `admin`       | 80    | Users, members, donations, settings |
| `manager`     | 60    | Members, donations, reports, export |
| `auditor`     | 50    | Read-only (all data)                |
| `data_entry`  | 40    | Create/edit members and donations   |
| `viewer`      | 20    | Own records only (`:own` scoped)    |

---

## Error Codes

| Code                | Name | Resolution                         |
| ------------------- | ---- | ---------------------------------- |
| `AUTH_REQUIRED`     | 401  | Include valid JWT token            |
| `FORBIDDEN`         | 403  | User lacks required permission     |
| `ACCOUNT_LOCKED`    | 423  | Wait for lockout expiry            |
| `POLICY_VIOLATION`  | 400  | Password doesn't meet requirements |
| `PASSWORD_REUSE`    | 400  | Cannot reuse recent passwords      |
| `ROLE_ESCALATION`   | 403  | Cannot assign higher role          |
| `SELF_MODIFICATION` | 403  | Cannot change own role             |
| `SELF_DELETION`     | 403  | Cannot delete own account          |
| `PROTECTED_ACCOUNT` | 403  | Cannot delete super_admin          |
| `VALIDATION_FAILED` | 400  | Data validation errors             |

---

## Validation Rules

Member data validation (see [ERROR_CODES.md](ERROR_CODES.md) for details):

| Field       | Rule                           | Error Code            |
| ----------- | ------------------------------ | --------------------- |
| `email`     | RFC 5322 format, max 254 chars | `INVALID_EMAIL`       |
| `telephone` | E.164 format (+14155551234)    | `INVALID_TELEPHONE`   |
| `zip`       | 5 digits or ZIP+4              | `INVALID_ZIP`         |
| `state`     | 2-char uppercase               | `INVALID_STATE`       |
| `firstName` | Required, non-empty            | `REQUIRED_FIRST_NAME` |
| `lastName`  | Required, non-empty            | `REQUIRED_LAST_NAME`  |
