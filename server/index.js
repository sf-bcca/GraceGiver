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
const { requirePermission, requireScopedPermission, requireRole, getRoleInfo } = require("./rbac");
const { getFinancialSummary } = require("./geminiService");


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
  requireScopedPermission("members:read", "member"),
  async (req, res) => {
    const { page = 1, limit = 50, search = "" } = req.query;
    const offset = (page - 1) * limit;

    try {
      // Updated to fetch joined_at
      let query = "SELECT * FROM members";
      let countQuery = "SELECT COUNT(*) FROM members";
      const params = [];
      const whereClauses = [];

      if (search) {
        whereClauses.push(`(first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }

      if (req.scopedToOwn && req.user.memberId) {
        whereClauses.push(`id = $${params.length + 1}`);
        params.push(req.user.memberId);
      }

      if (whereClauses.length > 0) {
        const whereString = " WHERE " + whereClauses.join(" AND ");
        query += whereString;
        countQuery += whereString;
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
          joinedAt: row.joined_at,
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

// ==========================================
// DATA EXPORT API
// ==========================================
const rateLimit = require('express-rate-limit');

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many export requests from this IP, please try again after 15 minutes',
});

const { stringify } = require('csv-stringify');

const QueryStream = require('pg-query-stream');

// Export Donations
app.get(
  "/api/export/donations",
  exportLimiter,
  authenticateToken,
  requirePermission("reports:export"),
  async (req, res) => {
    const { format = 'csv', startDate, endDate, fund } = req.query;

    try {
      let queryText = "SELECT d.id, m.first_name, m.last_name, m.email, d.amount, d.fund, d.donation_date, d.notes FROM donations d JOIN members m ON d.member_id = m.id";
      const params = [];
      const conditions = [];
      if (startDate && endDate) {
        conditions.push(`d.donation_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
        params.push(startDate, endDate);
      }
      if (fund) {
        conditions.push(`d.fund = $${params.length + 1}`);
        params.push(fund);
      }
      if (conditions.length > 0) {
        queryText += " WHERE " + conditions.join(" AND ");
      }
      queryText += " ORDER BY d.donation_date DESC";

      // Audit logging
      pool.query(
        "INSERT INTO export_logs (user_id, export_type, filters) VALUES ($1, $2, $3)",
        [req.user.id, 'donations', { format, startDate, endDate, fund }]
      ).catch(err => console.error("Audit log failed:", err));

      if (format === 'json') {
        const { rows } = await pool.query(queryText, params);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=donations_export.json');
        return res.json(rows);
      }

      // Handle CSV streaming
      const client = await pool.connect();
      const queryStream = new QueryStream(queryText, params);
      const stream = client.query(queryStream);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=donations_export.csv');

      const stringifier = stringify({ header: true });
      stream.pipe(stringifier).pipe(res);

      stream.on('end', () => client.release());
      stream.on('error', (err) => {
        console.error("Donation export stream error:", err);
        client.release();
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to export donations" });
        } else {
          res.end();
        }
      });

    } catch (err) {
      console.error("Donation export setup error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to export donations" });
      }
    }
  }
);

// Export Members
app.get(
  "/api/export/members",
  exportLimiter,
  authenticateToken,
  requirePermission("reports:export"),
  async (req, res) => {
    const { format = 'csv' } = req.query;
    const queryText = "SELECT id, first_name, last_name, email, telephone, address, city, state, zip, joined_at FROM members ORDER BY last_name, first_name";

    try {
      // Audit logging
      pool.query(
        "INSERT INTO export_logs (user_id, export_type, filters) VALUES ($1, $2, $3)",
        [req.user.id, 'members', { format }]
      ).catch(err => console.error("Audit log for member export failed:", err));

      if (format === 'json') {
        const { rows } = await pool.query(queryText);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=members_export.json');
        return res.json(rows);
      }

      const client = await pool.connect();
      const queryStream = new QueryStream(queryText);
      const stream = client.query(queryStream);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=members_export.csv');

      const stringifier = stringify({ header: true });
      stream.pipe(stringifier).pipe(res);

      stream.on('end', () => client.release());
      stream.on('error', (err) => {
        console.error("Member export stream error:", err);
        client.release();
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to export members" });
        } else {
          res.end();
        }
      });
    } catch (err) {
      console.error("Member export setup error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to export members" });
      }
    }
  }
);

app.get(
  "/api/members/:id",
  authenticateToken,
  requireScopedPermission("members:read", "member", (req) => req.params.id),
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
        joinedAt: row.joined_at,
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
      joinedAt,
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
        "INSERT INTO members (id, first_name, last_name, email, telephone, address, city, state, zip, family_id, joined_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
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
          joinedAt || null,
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
      joinedAt,
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
        "UPDATE members SET first_name = $1, last_name = $2, email = $3, telephone = $4, address = $5, city = $6, state = $7, zip = $8, family_id = $9, joined_at = $10 WHERE id = $11 RETURNING *",
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
          joinedAt || null,
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

// ServantHeart: Get Member Skills & Interests
app.get(
  "/api/members/:id/skills",
  authenticateToken,
  requireScopedPermission("members:read", "member", (req) => req.params.id),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "SELECT skills, interests FROM members WHERE id = $1",
        [id]
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

// ServantHeart: Update Member Skills & Interests
app.put(
  "/api/members/:id/skills",
  authenticateToken,
  requirePermission("members:update"),
  async (req, res) => {
    const { id } = req.params;
    const { skills, interests } = req.body;
    try {
      const result = await pool.query(
        "UPDATE members SET skills = $1, interests = $2 WHERE id = $3 RETURNING skills, interests",
        [skills, interests, id]
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
  requireScopedPermission("donations:read", "donation"),
  async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
      let countQuery = "SELECT COUNT(*) FROM donations";
      let query = "SELECT * FROM donations";
      const params = [];
      const whereClauses = [];

      if (req.scopedToOwn && req.user.memberId) {
        whereClauses.push(`member_id = $${params.length + 1}`);
        params.push(req.user.memberId);
      }

      if (whereClauses.length > 0) {
        const whereString = " WHERE " + whereClauses.join(" AND ");
        query += whereString;
        countQuery += whereString;
      }

      query += ` ORDER BY donation_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      params.push(limit, offset);
      const result = await pool.query(query, params);

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
  requireScopedPermission("donations:read", "donation"),
  async (req, res) => {
    try {
      let summaryQuery = `
      SELECT
        SUM(amount) as total,
        COUNT(*) as count,
        COUNT(DISTINCT member_id) as donor_count
      FROM donations
    `;
      const params = [];
      if (req.scopedToOwn && req.user.memberId) {
        summaryQuery += " WHERE member_id = $1";
        params.push(req.user.memberId);
      }
      const { rows } = await pool.query(summaryQuery, params);
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

// stewardship insight
app.post(
  "/api/ai/stewardship-insight",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    try {
      const { donations, members } = req.body;
      if (!donations || !members) {
        return res.status(400).json({ error: "Donations and members are required" });
      }

      const insight = await getFinancialSummary(donations, members);
      res.json({ insight });
    } catch (err) {
      console.error("AI Insight error:", err);
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

      // Ownership check for non-global actors
      if (!hasPermission(req.user.role, "donations:read") && 
          hasPermission(req.user.role, "donations:read:own") &&
          row.member_id !== req.user.memberId) {
        return res.status(403).json({ error: "Access denied to this donation" });
      }
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

const {
  generateBatchStatement,
  exportTransactions,
  getAtRiskDonors,
} = require("./reports");

const { generateMemberReportPDF } = require("./reports/memberReport");

console.log("--- REPORT HANDLER TYPES ---");
console.log("generateBatchStatement:", typeof generateBatchStatement);
console.log("exportTransactions:", typeof exportTransactions);
console.log("getAtRiskDonors:", typeof getAtRiskDonors);

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
    }
  }
);

// ServantHeart: Manage Ministry Opportunities
app.get(
  "/api/opportunities",
  authenticateToken,
  requirePermission("members:read"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM ministry_opportunities ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/api/opportunities",
  authenticateToken,
  requirePermission("members:write"),
  async (req, res) => {
    const { title, description, requiredSkills } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO ministry_opportunities (title, description, required_skills) VALUES ($1, $2, $3) RETURNING *",
        [title, description, requiredSkills]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ServantHeart: AI-Powered Talent Match
app.get(
  "/api/opportunities/:id/matches",
  authenticateToken,
  requirePermission("members:read"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const oppResult = await pool.query(
        "SELECT * FROM ministry_opportunities WHERE id = $1",
        [id]
      );
      if (oppResult.rows.length === 0) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      const opportunity = oppResult.rows[0];

      // Simple matching logic: find members with at least one overlapping skill
      const matchResult = await pool.query(
        `SELECT id, first_name, last_name, skills, interests 
         FROM members 
         WHERE skills && $1 OR interests && $1
         LIMIT 10`,
        [opportunity.required_skills]
      );

      res.json({
        opportunity,
        matches: matchResult.rows.map(m => ({
          memberId: m.id,
          name: `${m.first_name} ${m.last_name}`,
          skills: m.skills,
          matchScore: 0.85
        }))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// CommunityBridge: Manage Stewardship Campaigns
app.get(
  "/api/stewardship/campaigns",
  authenticateToken,
  async (req, res) => {
    try {
      // Get all active campaigns and their current progress
      const result = await pool.query(`
        SELECT 
          c.*,
          COALESCE(SUM(d.amount), 0) as current_amount
        FROM fund_campaigns c
        LEFT JOIN donations d ON c.fund_name = d.fund
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/api/stewardship/campaigns",
  authenticateToken,
  requirePermission("donations:write"),
  async (req, res) => {
    const { fundName, title, description, goalAmount, endDate } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO fund_campaigns (fund_name, title, description, goal_amount, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [fundName, title, description, goalAmount, endDate]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
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
      const result = await pool.query(
        `
      SELECT 
        EXTRACT(QUARTER FROM donation_date) as quarter, 
        SUM(amount) as total
      FROM donations
      WHERE EXTRACT(YEAR FROM donation_date) = $1
      GROUP BY quarter
      ORDER BY quarter
    `,
        [year]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Quarterly progress error:", err);
      res.status(500).json({ error: "Failed to fetch quarterly progress" });
    }
  }
);

// GraceForecast: At-Risk Donor Prediction
app.get(
  "/api/forecast/at-risk",
  authenticateToken,
  requirePermission("reports:read"),
  async (req, res) => {
    try {
      const atRiskData = await getAtRiskDonors(pool);
      res.json(atRiskData);
    } catch (err) {
      console.error("Forecast error:", err);
      res.status(500).json({ error: "Failed to generate forecast" });
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
// Get Single Member Report Data (JSON)
app.get(
  "/api/members/:id/report",
  authenticateToken,
  requireScopedPermission("reports:read", "member", (req) => req.params.id),
  async (req, res) => {
    const { id } = req.params;
    try {
      // 1. Fetch Member
      const memberRes = await pool.query("SELECT * FROM members WHERE id = $1", [id]);
      if (memberRes.rows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }
      const member = memberRes.rows[0];

      // 2. Fetch Aggregates
      const statsRes = await pool.query(`
        SELECT
          COALESCE(SUM(amount), 0) as lifetime_total,
          MAX(donation_date) as last_donation_date,
          COUNT(*) as donation_count
        FROM donations
        WHERE member_id = $1
      `, [id]);
      const stats = statsRes.rows[0];

      // 3. Last Donation Amount
      const lastDonationRes = await pool.query(`
        SELECT amount FROM donations
        WHERE member_id = $1
        ORDER BY donation_date DESC
        LIMIT 1
      `, [id]);
      const lastDonationAmount = lastDonationRes.rows.length > 0 ? parseFloat(lastDonationRes.rows[0].amount) : 0;

      // 4. Recent Activity
      const historyRes = await pool.query(`
        SELECT id, amount, fund, donation_date
        FROM donations
        WHERE member_id = $1
        ORDER BY donation_date DESC
        LIMIT 20
      `, [id]);

      // 5. Calculate Tenure
      let yearsOfMembership = 0;
      if (member.joined_at) {
        const joinDate = new Date(member.joined_at);
        const now = new Date();
        const diffTime = Math.abs(now - joinDate);
        yearsOfMembership = parseFloat((diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));
      }

      res.json({
        member: {
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          joinedAt: member.joined_at
        },
        stats: {
          lifetimeGiving: parseFloat(stats.lifetime_total),
          lastDonationDate: stats.last_donation_date,
          lastDonationAmount,
          donationCount: parseInt(stats.donation_count),
          yearsOfMembership
        },
        recentActivity: historyRes.rows.map(row => ({
          id: row.id,
          amount: parseFloat(row.amount),
          fund: row.fund,
          date: row.donation_date
        }))
      });

    } catch (err) {
      console.error("Member report error:", err);
      res.status(500).json({ error: "Failed to generate member report" });
    }
  }
);

// Get Single Member Report PDF
app.get(
  "/api/members/:id/report/pdf",
  authenticateToken,
  requireScopedPermission("reports:read", "member", (req) => req.params.id),
  async (req, res) => {
    const { id } = req.params;
    try {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=member-report-${id}.pdf`
      );
      await generateMemberReportPDF(pool, id, res);
    } catch (err) {
      console.error("PDF Report Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF" });
      } else {
        res.end();
      }
    }
  }
);

app.get(
  "/api/users",
  authenticateToken,
  requirePermission("users:read"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        id, username, role, email, member_id,
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
          memberId: user.member_id,
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
    const { username, password, role, email, memberId } = req.body;

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
      INSERT INTO users (username, password_hash, role, email, must_change_password, member_id)
      VALUES ($1, $2, $3, $4, true, $5)
      RETURNING id, username, role, email, created_at, must_change_password, member_id
    `,
        [username, passwordHash, requestedRole, email || null, memberId || null]
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
    const { username, role, email, memberId } = req.body;

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
      if (memberId !== undefined) {
        updates.push(`member_id = $${paramCount++}`);
        values.push(memberId || null);
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
