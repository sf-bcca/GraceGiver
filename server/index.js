const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

app.get('/api/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY last_name, first_name');
    res.json(result.rows.map(row => ({
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
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/members', async (req, res) => {
  const { id, firstName, lastName, email, address, city, state, zip, familyId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO members (id, first_name, last_name, email, address, city, state, zip, family_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [id, firstName, lastName, email, address, city, state, zip, familyId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/donations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM donations ORDER BY donation_date DESC');
    res.json(result.rows.map(row => ({
      id: row.id.toString(),
      memberId: row.member_id,
      amount: parseFloat(row.amount),
      fund: row.fund,
      notes: row.notes,
      enteredBy: row.entered_by,
      date: row.donation_date,
      timestamp: row.donation_date
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/donations', async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
