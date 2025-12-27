const express = require('express');
const compression = require('compression');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { validateMember } = require('./validation');
const { authenticateToken, generateToken } = require('./auth');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Catch unhandled errors to prevent silent exit
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/members', authenticateToken, async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM members';
    let countQuery = 'SELECT COUNT(*) FROM members';
    const params = [];

    if (search) {
      query += ' WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1';
      countQuery += ' WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ` ORDER BY last_name, first_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(query, params);

    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        familyId: row.family_id,
        createdAt: row.created_at
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/members/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      familyId: row.family_id,
      createdAt: row.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/members', authenticateToken, async (req, res) => {
  const { id, firstName, lastName, email, address, city, state, zip, familyId } = req.body;
  
  // High-priority validation check
  const validation = validateMember({ firstName, lastName, email, state, zip });
  if (!validation.isValid) {
    return res.status(400).json({ 
      error: 'VALIDATION_FAILED', 
      details: validation.errors 
    });
  }

  const memberId = id || crypto.randomUUID();

  try {
    const result = await pool.query(
      'INSERT INTO members (id, first_name, last_name, email, address, city, state, zip, family_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [memberId, firstName, lastName, email, address, city, state, zip, familyId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, address, city, state, zip, familyId } = req.body;

  const validation = validateMember({ firstName, lastName, email, state, zip });
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'VALIDATION_FAILED',
      details: validation.errors
    });
  }

  try {
    const result = await pool.query(
      'UPDATE members SET first_name = $1, last_name = $2, email = $3, address = $4, city = $5, state = $6, zip = $7, family_id = $8 WHERE id = $9 RETURNING *',
      [firstName, lastName, email, address, city, state, zip, familyId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/donations', authenticateToken, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countQuery = 'SELECT COUNT(*) FROM donations';
    const query = 'SELECT * FROM donations ORDER BY donation_date DESC LIMIT $1 OFFSET $2';

    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(query, [limit, offset]);

    res.json({
      data: result.rows.map(row => ({
        id: row.id.toString(),
        memberId: row.member_id,
        amount: parseFloat(row.amount),
        fund: row.fund,
        notes: row.notes,
        enteredBy: row.entered_by,
        date: row.donation_date,
        timestamp: row.donation_date
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/donations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM donations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
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
      timestamp: row.donation_date
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/donations', authenticateToken, async (req, res) => {
  const { memberId, amount, fund, notes, enteredBy } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO donations (member_id, amount, fund, notes, entered_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [memberId, amount, fund, notes, enteredBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/donations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { amount, fund, notes, enteredBy } = req.body;
  try {
    const result = await pool.query(
      'UPDATE donations SET amount = $1, fund = $2, notes = $3, entered_by = $4 WHERE id = $5 RETURNING *',
      [amount, fund, notes, enteredBy, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/donations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM donations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    res.json({ message: 'Donation deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const { generateBatchStatement, exportTransactions } = require('./reports');

console.log('--- REPORT HANDLER TYPES ---');
console.log('generateBatchStatement:', typeof generateBatchStatement);
console.log('exportTransactions:', typeof exportTransactions);

app.get('/api/reports/statements', authenticateToken, async (req, res) => {
  console.log('GET /api/reports/statements hit');

  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'Year is required' });

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
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=statements-${year}.pdf`);

    await generateBatchStatement(pool, year, res);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    console.error('Stack:', err.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: `Server Error: ${err.message}`, stack: err.stack });
    } else {
        // If headers sent, we can't send JSON. End the stream to prevent hang.
        res.end();
    }
  }
});

app.get('/api/reports/export', authenticateToken, async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'Year is required' });

  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=donations-${year}.csv`);
    
    await exportTransactions(pool, year, res);
  } catch (err) {
    console.error(err);
    // Note: If headers are already sent (streaming started), this might fail to send JSON error.
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error generating CSV' });
    }
  }
});

// Phase 2: Missing Email Report
app.get('/api/reports/missing-emails', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, first_name, last_name, address, city, state, created_at
      FROM members
      WHERE email IS NULL OR email = ''
      ORDER BY last_name, first_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Missing emails report error:', err);
    res.status(500).json({ error: 'Failed to fetch missing emails report' });
  }
});

// Phase 2: New Donor List (Last 30 Days)
app.get('/api/reports/new-donors', authenticateToken, async (req, res) => {
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
    console.error('New donors report error:', err);
    res.status(500).json({ error: 'Failed to fetch new donors report' });
  }
});

// Phase 3: Top 10 Fund Distributions
app.get('/api/reports/fund-distribution', authenticateToken, async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'Year is required' });
  
  try {
    const result = await pool.query(`
      SELECT fund, SUM(amount) as total
      FROM donations
      WHERE EXTRACT(YEAR FROM donation_date) = $1
      GROUP BY fund
      ORDER BY total DESC
      LIMIT 10
    `, [year]);
    res.json(result.rows);
  } catch (err) {
    console.error('Fund distribution error:', err);
    res.status(500).json({ error: 'Failed to fetch fund distribution' });
  }
});

// Phase 3: Quarterly Progress Summary
app.get('/api/reports/quarterly-progress', authenticateToken, async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: 'Year is required' });
  
  try {
    const currentYear = parseInt(year);
    const previousYear = currentYear - 1;
    const result = await pool.query(`
      SELECT 
        EXTRACT(QUARTER FROM donation_date)::int as quarter,
        EXTRACT(YEAR FROM donation_date)::int as year,
        SUM(amount) as total
      FROM donations
      WHERE EXTRACT(YEAR FROM donation_date)::int IN ($1, $2)
      GROUP BY year, quarter
      ORDER BY year, quarter
    `, [currentYear, previousYear]);
    res.json(result.rows);
  } catch (err) {
    console.error('Quarterly progress error:', err);
    res.status(500).json({ error: 'Failed to fetch quarterly progress' });
  }
});

// Phase 3: Trend Analysis (3 Year)
app.get('/api/reports/trend-analysis', authenticateToken, async (req, res) => {
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
    console.error('Trend analysis error:', err);
    res.status(500).json({ error: 'Failed to fetch trend analysis' });
  }
});

// Simple test route to verify routing works
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', routes: 'working' });
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on('close', () => {
  console.log('Server closed');
});

// Keep-alive interval to prevent premature exit
setInterval(() => {}, 1000 * 60 * 60); // 1 hour interval
