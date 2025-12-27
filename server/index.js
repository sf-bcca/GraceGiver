const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validateMember } = require('./validation');
const { authenticateToken, generateToken } = require('./auth');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
