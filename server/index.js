const express = require("express");
const compression = require("compression");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const { validateMember } = require("./validation");
const { authenticateToken, generateToken } = require("./auth");
const { bootstrapSuperAdmin } = require("./bootstrap");

const {
  validatePasswordPolicy,
  checkPasswordExpiry,
  getPasswordPolicy,
} = require("./passwordPolicy");
const { requirePermission, requireRole, getRoleInfo } = require("./rbac");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

// Log pool errors
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

// Catch unhandled errors to prevent silent exit
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.locked_until) - new Date()) / 60000
      );
      return res.status(423).json({
        error: "Account temporarily locked",
        message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
        code: "ACCOUNT_LOCKED",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const lockoutMinutes =
        parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15;

      if (newAttempts >= maxAttempts) {
        await pool.query(
          "UPDATE users SET failed_login_attempts = $1, locked_until = NOW() + INTERVAL '$2 minutes' WHERE id = $3",
          [newAttempts, lockoutMinutes, user.id]
        );
        return res.status(423).json({
          error: "Account locked",
          message: `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.`,
          code: "ACCOUNT_LOCKED",
        });
      } else {
        await pool.query(
          "UPDATE users SET failed_login_attempts = $1 WHERE id = $2",
          [newAttempts, user.id]
        );
      }

      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset failed attempts on successful login
    await pool.query(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1",
      [user.id]
    );

    const token = generateToken(user);

    // Check if password change is required
    const mustChangePassword = user.must_change_password || false;

    // Check password expiration (if enabled)
    const expiryCheck = checkPasswordExpiry(user.password_changed_at);
    const passwordExpired = expiryCheck.expiryEnabled && expiryCheck.expired;

    // Get role permissions for frontend
    const roleInfo = getRoleInfo(user.role);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: roleInfo.permissions,
        canManageUsers: roleInfo.canManageUsers,
        canExportData: roleInfo.canExportData,
        canDeleteMembers: roleInfo.canDeleteMembers,
        canDeleteDonations: roleInfo.canDeleteDonations,
      },
      mustChangePassword: mustChangePassword || passwordExpired,
      passwordExpiry: expiryCheck.expiryEnabled
        ? {
            daysRemaining: expiryCheck.daysRemaining,
            expired: expiryCheck.expired,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Password change endpoint
app.post("/api/users/change-password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new passwords are required" });
  }

  // Validate new password against policy
  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return res.status(400).json({
      error: "Password policy violation",
      details: policyCheck.errors,
      code: "POLICY_VIOLATION",
    });
  }

  try {
    // Get current user
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult.rows[0];

    // Verify current password
    const validCurrent = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!validCurrent) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check password history (prevent reuse of last 5 passwords)
    const history = user.password_history || [];
    for (const oldHash of history.slice(-5)) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return res.status(400).json({
          error: "Cannot reuse recent passwords",
          code: "PASSWORD_REUSE",
        });
      }
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update user with new password
    await pool.query(
      `
      UPDATE users 
      SET password_hash = $1, 
          password_changed_at = NOW(),
          password_history = COALESCE(password_history, '[]'::jsonb) || $2::jsonb,
          must_change_password = false,
          updated_at = NOW()
      WHERE id = $3
    `,
      [newHash, JSON.stringify([user.password_hash]), userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Password policy endpoint (public - for showing requirements on login page)
app.get("/api/auth/password-policy", (req, res) => {
  res.json(getPasswordPolicy());
});

// Validate password strength (public - for real-time feedback)
app.post("/api/auth/validate-password", (req, res) => {
  const { password } = req.body;
  const result = validatePasswordPolicy(password || "");
  // Don't return the actual password validation errors to unauthenticated users
  // Just return strength and general requirements
  res.json({
    strength: result.strength,
    strengthLabel: result.strengthLabel,
    meetsRequirements: result.valid,
  });
});

app.get(
  "/api/members",
  authenticateToken,
  requirePermission("members:read"),
  async (req, res) => {
    const { page = 1, limit = 50, search = "" } = req.query;
    const offset = (page - 1) * limit;

    try {
      let query = "SELECT * FROM members";
      let countQuery = "SELECT COUNT(*) FROM members";
      const params = [];

      if (search) {
        query +=
          " WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1";
        countQuery +=
          " WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1";
        params.push(`%${search}%`);
      }

      query += ` ORDER BY last_name, first_name LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`;

      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      params.push(limit, offset);
      const result = await pool.query(query, params);

      res.json({
        data: result.rows.map((row) => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          telephone: row.telephone,
          address: row.address,
          city: row.city,
          state: row.state,
          zip: row.zip,
          familyId: row.family_id,
          createdAt: row.created_at,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/api/members/:id",
  authenticateToken,
  requirePermission("members:read"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query("SELECT * FROM members WHERE id = $1", [
        id,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }
      const row = result.rows[0];
      res.json({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        telephone: row.telephone,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        familyId: row.family_id,
        createdAt: row.created_at,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/api/members",
  authenticateToken,
  requirePermission("members:create"),
  async (req, res) => {
    const {
      id,
      firstName,
      lastName,
      email,
      telephone,
      address,
      city,
      state,
      zip,
      familyId,
    } = req.body;

    // High-priority validation check
    const validation = validateMember({
      firstName,
      lastName,
      email,
      telephone,
      state,
      zip,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        error: "VALIDATION_FAILED",
        details: validation.errors,
      });
    }

    const memberId = id || crypto.randomUUID();

    try {
      const result = await pool.query(
        "INSERT INTO members (id, first_name, last_name, email, telephone, address, city, state, zip, family_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [
          memberId,
          firstName,
          lastName,
          email,
          telephone,
          address,
          city,
          state,
          zip,
          familyId,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.put(
  "/api/members/:id",
  authenticateToken,
  requirePermission("members:update"),
  async (req, res) => {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      telephone,
      address,
      city,
      state,
      zip,
      familyId,
    } = req.body;

    const validation = validateMember({
      firstName,
      lastName,
      email,
      telephone,
      state,
      zip,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        error: "VALIDATION_FAILED",
        details: validation.errors,
      });
    }

    try {
      const result = await pool.query(
        "UPDATE members SET first_name = $1, last_name = $2, email = $3, telephone = $4, address = $5, city = $6, state = $7, zip = $8, family_id = $9 WHERE id = $10 RETURNING *",
        [
          firstName,
          lastName,
          email,
          telephone,
          address,
          city,
          state,
          zip,
          familyId,
          id,
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.delete(
  "/api/members/:id",
  authenticateToken,
  requirePermission("members:delete"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "DELETE FROM members WHERE id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json({ message: "Member deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/api/donations",
  authenticateToken,
  requirePermission("donations:read"),
  async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const countQuery = "SELECT COUNT(*) FROM donations";
      const query =
        "SELECT * FROM donations ORDER BY donation_date DESC LIMIT $1 OFFSET $2";

      const countResult = await pool.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      const result = await pool.query(query, [limit, offset]);

      res.json({
        data: result.rows.map((row) => ({
          id: row.id.toString(),
          memberId: row.member_id,
          amount: parseFloat(row.amount),
          fund: row.fund,
          notes: row.notes,
          enteredBy: row.entered_by,
          date: row.donation_date,
          timestamp: row.donation_date,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// NOTE: /summary MUST come before /:id to avoid "summary" being matched as an ID parameter
app.get(
  "/api/donations/summary",
  authenticateToken,
  requirePermission("donations:read"),
  async (req, res) => {
    try {
      const summaryQuery = `
      SELECT
        SUM(amount) as total,
        COUNT(*) as count,
        COUNT(DISTINCT member_id) as donor_count
      FROM donations
    `;
      const { rows } = await pool.query(summaryQuery);
      const { total, count, donor_count } = rows[0];

      const totalDonations = parseFloat(total) || 0;
      const donationCount = parseInt(count) || 0;
      const donorCount = parseInt(donor_count) || 0;
      const avgDonation = totalDonations / (donationCount || 1);

      res.json({
        totalDonations,
        donationCount,
        donorCount,
        avgDonation,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/api/donations/:id",
  authenticateToken,
  requirePermission("donations:read"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query("SELECT * FROM donations WHERE id = $1", [
        id,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Donation not found" });
      }
      const row = result.rows[0];
      res.json({
        id: row.id.toString(),
        memberId: row.member_id,
        amount: parseFloat(row.amount),
        fund: row.fund,
        notes: row.notes,
        enteredBy: row.entered_by,
        date: row.donation_date,
        timestamp: row.donation_date,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/api/donations",
  authenticateToken,
  requirePermission("donations:create"),
  async (req, res) => {
    const { memberId, amount, fund, notes, enteredBy } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO donations (member_id, amount, fund, notes, entered_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [memberId, amount, fund, notes, enteredBy]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.put(
  "/api/donations/:id",
  authenticateToken,
  requirePermission("donations:update"),
  async (req, res) => {
    const { id } = req.params;
    const { amount, fund, notes, enteredBy } = req.body;
    try {
      const result = await pool.query(
        "UPDATE donations SET amount = $1, fund = $2, notes = $3, entered_by = $4 WHERE id = $5 RETURNING *",
        [amount, fund, notes, enteredBy, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Donation not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.delete(
  "/api/donations/:id",
  authenticateToken,
  requirePermission("donations:delete"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "DELETE FROM donations WHERE id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Donation not found" });
      }
      res.json({ message: "Donation deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

const { generateBatchStatement, exportTransactions } = require("./reports");

console.log("--- REPORT HANDLER TYPES ---");
console.log("generateBatchStatement:", typeof generateBatchStatement);
console.log("exportTransactions:", typeof exportTransactions);

app.get(
  "/api/reports/statements",
  authenticateToken,
  requirePermission("reports:export"),
  async (req, res) => {
    console.log("GET /api/reports/statements hit");

    const { year } = req.query;
    if (!year) return res.status(400).json({ error: "Year is required" });

    try {
      // Set headers first, assuming success. If DB fails, we try to send JSON error but it might fail if headers sent?
      // Actually, `generateBatchStatement` does DB query FIRST, then pipes.
      // Wait, if I set headers here, and DB fails in `generateBatchStatement` before piping, can I overwrite headers?
      // Express allows `res.status(500)` even if `res.setHeader()` was called but body not sent.
      // However, if we pipe, headers are sent.

      // We will let generateBatchStatement handle piping.
      // Ideally we set headers only after DB query succeeds inside `generateBatchStatement`.
      // But `generateBatchStatement` as refactored does query -> pipe.
      // So we can set headers here.

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=statements-${year}.pdf`
      );

      await generateBatchStatement(pool, year, res);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      console.error("Stack:", err.stack);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: `Server Error: ${err.message}`, stack: err.stack });
      } else {
        // If headers sent, we can't send JSON. End the stream to prevent hang.
        res.end();
      }
    }
  }
);

app.get(
  "/api/reports/export",
  authenticateToken,
  requirePermission("reports:export"),
  async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: "Year is required" });

    try {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=donations-${year}.csv`
      );

      await exportTransactions(pool, year, res);
    } catch (err) {
      console.error(err);
      // Note: If headers are already sent (streaming started), this might fail to send JSON error.
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error generating CSV" });
      }
    }
  }
);

// Phase 2: Missing Email Report
app.get(
  "/api/reports/missing-emails",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT id, first_name, last_name, address, city, state, created_at
      FROM members
      WHERE email IS NULL OR email = ''
      ORDER BY last_name, first_name
    `);
      res.json(result.rows);
    } catch (err) {
      console.error("Missing emails report error:", err);
      res.status(500).json({ error: "Failed to fetch missing emails report" });
    }
  }
);

// Phase 2: New Donor List (Last 30 Days)
app.get(
  "/api/reports/new-donors",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        m.id, m.first_name, m.last_name, m.email, m.address, m.created_at,
        COALESCE(SUM(d.amount), 0) as total_donated,
        COUNT(d.id) as donation_count
      FROM members m
      LEFT JOIN donations d ON m.id = d.member_id
      WHERE m.created_at > NOW() - INTERVAL '30 days'
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
      res.json(result.rows);
    } catch (err) {
      console.error("New donors report error:", err);
      res.status(500).json({ error: "Failed to fetch new donors report" });
    }
  }
);

// Phase 3: Top 10 Fund Distributions
app.get(
  "/api/reports/fund-distribution",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: "Year is required" });

    try {
      const result = await pool.query(
        `
      SELECT fund, SUM(amount) as total
      FROM donations
      WHERE EXTRACT(YEAR FROM donation_date) = $1
      GROUP BY fund
      ORDER BY total DESC
      LIMIT 10
    `,
        [year]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Fund distribution error:", err);
      res.status(500).json({ error: "Failed to fetch fund distribution" });
    }
  }
);

// Phase 3: Quarterly Progress Summary
app.get(
  "/api/reports/quarterly-progress",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: "Year is required" });

    try {
      const currentYear = parseInt(year);
      const previousYear = currentYear - 1;
      const result = await pool.query(
        `
      SELECT 
        EXTRACT(QUARTER FROM donation_date)::int as quarter,
        EXTRACT(YEAR FROM donation_date)::int as year,
        SUM(amount) as total
      FROM donations
      WHERE EXTRACT(YEAR FROM donation_date)::int IN ($1, $2)
      GROUP BY year, quarter
      ORDER BY year, quarter
    `,
        [currentYear, previousYear]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Quarterly progress error:", err);
      res.status(500).json({ error: "Failed to fetch quarterly progress" });
    }
  }
);

// Phase 3: Trend Analysis (3 Year)
app.get(
  "/api/reports/trend-analysis",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM donation_date)::int as year,
        SUM(amount) as total
      FROM donations
      WHERE donation_date > NOW() - INTERVAL '3 years'
      GROUP BY year
      ORDER BY year
    `);
      res.json(result.rows);
    } catch (err) {
      console.error("Trend analysis error:", err);
      res.status(500).json({ error: "Failed to fetch trend analysis" });
    }
  }
);

// ==========================================
// USER MANAGEMENT API (Phase 4)
// ==========================================

const { canManageRole } = require("./rbac");

// List all users (admin+)
app.get(
  "/api/users",
  authenticateToken,
  requirePermission("users:read"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        id, username, role, email,
        created_at, last_login_at,
        failed_login_attempts, locked_until,
        must_change_password
      FROM users
      ORDER BY created_at DESC
    `);

      res.json(
        result.rows.map((user) => ({
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          isLocked:
            user.locked_until && new Date(user.locked_until) > new Date(),
          lockedUntil: user.locked_until,
          failedAttempts: user.failed_login_attempts,
          mustChangePassword: user.must_change_password,
        }))
      );
    } catch (err) {
      console.error("List users error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

// Create new user (admin+)
app.post(
  "/api/users",
  authenticateToken,
  requirePermission("users:write"),
  async (req, res) => {
    const { username, password, role, email } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Validate password policy
    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return res.status(400).json({
        error: "Password policy violation",
        details: policyCheck.errors,
      });
    }

    // Check if current user can assign the requested role
    const requestedRole = role || "viewer";
    if (!canManageRole(req.user.role, requestedRole)) {
      return res.status(403).json({
        error: "Cannot assign role equal to or higher than your own",
        code: "ROLE_ESCALATION",
      });
    }

    try {
      // Check if username exists
      const existing = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `
      INSERT INTO users (username, password_hash, role, email, must_change_password)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, username, role, email, created_at, must_change_password
    `,
        [username, passwordHash, requestedRole, email || null]
      );

      console.log(
        `[AUDIT] User created: ${username} with role ${requestedRole} by ${req.user.username}`
      );

      res.status(201).json({
        id: result.rows[0].id,
        username: result.rows[0].username,
        role: result.rows[0].role,
        email: result.rows[0].email,
        createdAt: result.rows[0].created_at,
        mustChangePassword: result.rows[0].must_change_password,
      });
    } catch (err) {
      console.error("Create user error:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// Update user (username, role, email) - admin+
app.put(
  "/api/users/:id",
  authenticateToken,
  requirePermission("users:write"),
  async (req, res) => {
    const { id } = req.params;
    const { username, role, email } = req.body;

    // Prevent self-demotion or changing own username in this endpoint
    if (
      parseInt(id) === req.user.id &&
      ((role && role !== req.user.role) || username)
    ) {
      return res.status(403).json({
        error:
          "Cannot change your own role or username. Please use account settings.",
        code: "SELF_MODIFICATION",
      });
    }

    try {
      // Get target user
      const targetUser = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [id]
      );
      if (targetUser.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if can manage target user's current role
      if (!canManageRole(req.user.role, targetUser.rows[0].role)) {
        return res.status(403).json({
          error: "Cannot modify user with role equal to or higher than yours",
          code: "INSUFFICIENT_PRIVILEGE",
        });
      }

      // Check if can assign new role
      if (role && !canManageRole(req.user.role, role)) {
        return res.status(403).json({
          error: "Cannot assign role equal to or higher than your own",
          code: "ROLE_ESCALATION",
        });
      }

      // If username is being changed, check for conflicts
      if (username) {
        const existing = await pool.query(
          "SELECT id FROM users WHERE username = $1 AND id != $2",
          [username, id]
        );
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: "Username already exists" });
        }
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (username) {
        updates.push(`username = $${paramCount++}`);
        values.push(username);
      }
      if (role) {
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }
      if (email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(email || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      values.push(id);
      const result = await pool.query(
        `
      UPDATE users SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, username, role, email
    `,
        values
      );

      console.log(
        `[AUDIT] User ${id} updated by ${req.user.username}: ${JSON.stringify({
          username,
          role,
          email,
        })}`
      );

      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === "23505") {
        // unique_violation for username
        return res.status(409).json({ error: "Username already exists." });
      }
      console.error("Update user error:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Delete/disable user (admin+)
app.delete(
  "/api/users/:id",
  authenticateToken,
  requirePermission("users:delete"),
  async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({
        error: "Cannot delete your own account",
        code: "SELF_DELETION",
      });
    }

    try {
      // Get target user
      const targetUser = await pool.query(
        "SELECT username, role FROM users WHERE id = $1",
        [id]
      );
      if (targetUser.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent deleting super_admin
      if (targetUser.rows[0].role === "super_admin") {
        return res.status(403).json({
          error: "Cannot delete super admin accounts",
          code: "PROTECTED_ACCOUNT",
        });
      }

      // Check if can manage target user's role
      if (!canManageRole(req.user.role, targetUser.rows[0].role)) {
        return res.status(403).json({
          error: "Cannot delete user with role equal to or higher than yours",
          code: "INSUFFICIENT_PRIVILEGE",
        });
      }

      await pool.query("DELETE FROM users WHERE id = $1", [id]);

      console.log(
        `[AUDIT] User ${targetUser.rows[0].username} (${id}) deleted by ${req.user.username}`
      );

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

// Unlock user account (admin+)
app.post(
  "/api/users/:id/unlock",
  authenticateToken,
  requirePermission("users:write"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `
      UPDATE users 
      SET locked_until = NULL, failed_login_attempts = 0
      WHERE id = $1
      RETURNING id, username
    `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(
        `[AUDIT] User ${result.rows[0].username} unlocked by ${req.user.username}`
      );

      res.json({ message: "Account unlocked successfully" });
    } catch (err) {
      console.error("Unlock user error:", err);
      res.status(500).json({ error: "Failed to unlock user" });
    }
  }
);

// Force password reset (admin+)
app.post(
  "/api/users/:id/reset-password",
  authenticateToken,
  requirePermission("users:write"),
  async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    // Validate password policy
    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({
        error: "Password policy violation",
        details: policyCheck.errors,
      });
    }

    try {
      // Get target user
      const targetUser = await pool.query(
        "SELECT username, role FROM users WHERE id = $1",
        [id]
      );
      if (targetUser.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if can manage target user's role
      if (!canManageRole(req.user.role, targetUser.rows[0].role)) {
        return res.status(403).json({
          error:
            "Cannot reset password for user with role equal to or higher than yours",
          code: "INSUFFICIENT_PRIVILEGE",
        });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await pool.query(
        `
      UPDATE users 
      SET password_hash = $1, 
          must_change_password = true,
          password_changed_at = NOW(),
          locked_until = NULL,
          failed_login_attempts = 0
      WHERE id = $2
    `,
        [passwordHash, id]
      );

      console.log(
        `[AUDIT] Password reset for ${targetUser.rows[0].username} by ${req.user.username}`
      );

      res.json({
        message:
          "Password reset successfully. User must change password on next login.",
      });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

// Get available roles (for dropdowns)
app.get(
  "/api/roles",
  authenticateToken,
  requirePermission("users:read"),
  async (req, res) => {
    const { ROLE_LEVELS } = require("./rbac");

    // Only return roles that the current user can assign
    const userLevel = ROLE_LEVELS[req.user.role] || 0;

    const assignableRoles = Object.entries(ROLE_LEVELS)
      .filter(
        ([role, level]) => level < userLevel || req.user.role === "super_admin"
      )
      .map(([role, level]) => ({
        name: role,
        level,
        label: role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      }))
      .sort((a, b) => b.level - a.level);

    res.json(assignableRoles);
  }
);

// Simple test route to verify routing works
app.get("/api/test", (req, res) => {
  res.json({ status: "ok", routes: "working" });
});

// Startup function with bootstrap
async function startServer() {
  try {
    // Bootstrap super admin on first run
    await bootstrapSuperAdmin(pool);

    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    server.on("close", () => {
      console.log("Server closed");
    });

    // Keep-alive interval to prevent premature exit
    setInterval(() => {}, 1000 * 60 * 60); // 1 hour interval
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
