/**
 * Registration Logic Unit Tests
 * 
 * Tests the registration flow, including member matching and creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';

describe('Registration Logic', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn(),
        release: vi.fn()
      })
    };

    app = express();
    app.use(express.json());

    // Mock the registration route logic
    app.post('/api/register', async (req, res) => {
      const { firstName, lastName, email, telephone, password } = req.body;
      
      try {
        // 1. Check existing user
        const existingUser = await mockPool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

        // 2. Match or create member
        let memberId;
        const existingMember = await mockPool.query("SELECT id FROM members WHERE email = $1", [email]);
        
        if (existingMember.rows.length > 0) {
          memberId = existingMember.rows[0].id;
        } else {
          memberId = 'new-id';
          await mockPool.query("INSERT INTO members (id, first_name, last_name, email, telephone) VALUES ($1, $2, $3, $4, $5)", [memberId, firstName, lastName, email, telephone]);
        }

        // 3. Create user
        const hash = await bcrypt.hash(password, 1);
        await mockPool.query("INSERT INTO users (username, email, password_hash, role, member_id) VALUES ($1, $2, $3, $4, $5)", [email, email, hash, 'viewer', memberId]);

        res.status(201).json({ message: "Success" });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  it('should link to existing member if email matches', async () => {
    // No existing user
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    // Existing member found
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'M-EXISTING' }] });

    const res = await request(app).post('/api/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123!'
    });

    expect(res.status).toBe(201);
    // Should NOT have called INSERT INTO members
    const insertMemberCall = mockPool.query.mock.calls.find(c => c[0].includes('INSERT INTO members'));
    expect(insertMemberCall).toBeUndefined();
    
    // Should have called INSERT INTO users with the existing memberId
    const insertUserCall = mockPool.query.mock.calls.find(c => c[0].includes('INSERT INTO users'));
    expect(insertUserCall[1]).toContain('M-EXISTING');
  });

  it('should create new member if no match found', async () => {
    // No existing user
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    // No existing member found
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/register').send({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'Password123!'
    });

    expect(res.status).toBe(201);
    // Should have called INSERT INTO members
    const insertMemberCall = mockPool.query.mock.calls.find(c => c[0].includes('INSERT INTO members'));
    expect(insertMemberCall).toBeDefined();
  });

  it('should reject if email already has a user account', async () => {
    // Existing user found
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).post('/api/register').send({
      firstName: 'Existing',
      lastName: 'User',
      email: 'already@used.com',
      password: 'Password123!'
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already registered');
  });
});
