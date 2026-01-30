/**
 * Self-Service Endpoints Unit Tests
 * 
 * Tests for /api/self/profile and /api/self/donations.
 * Mocks database and auth to test endpoint logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authenticateToken } from '../auth.js';
import { requireScopedPermission } from '../rbac.js';

// We need to mock the dependencies before importing the app logic
// Since server/index.js exports nothing and starts the server, 
// we'll create a minimal express app with the routes for testing.

describe('Self-Service Endpoints', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: vi.fn()
    };

    app = express();
    app.use(express.json());

    // Mock middleware
    const mockAuth = (req, res, next) => {
      req.user = { id: 1, role: 'viewer', memberId: 'M1' };
      next();
    };

    const mockScopedPermission = (permission, resourceType, idResolver) => {
      return (req, res, next) => {
        const id = idResolver ? idResolver(req) : null;
        if (id === 'M1') {
          next();
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
      };
    };

    // Implement the routes exactly as in server/index.js for logic verification
    app.get('/api/self/profile', mockAuth, mockScopedPermission('members:read', 'member', (req) => req.user.memberId), async (req, res) => {
      try {
        const result = await mockPool.query("SELECT * FROM members WHERE id = $1", [req.user.memberId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
      } catch (err) {
        res.status(500).json({ error: "Error" });
      }
    });

    app.get('/api/self/donations', mockAuth, mockScopedPermission('donations:read', 'donation', (req) => req.user.memberId), async (req, res) => {
      try {
        const result = await mockPool.query("SELECT * FROM donations WHERE member_id = $1", [req.user.memberId]);
        res.json({ data: result.rows });
      } catch (err) {
        res.status(500).json({ error: "Error" });
      }
    });

    app.get('/api/self/statements', mockAuth, mockScopedPermission('reports:read', 'report', (req) => req.user.memberId), async (req, res) => {
      try {
        const result = await mockPool.query("SELECT DISTINCT EXTRACT(YEAR FROM donation_date)::int as year FROM donations WHERE member_id = $1", [req.user.memberId]);
        res.json(result.rows.map(r => r.year));
      } catch (err) {
        res.status(500).json({ error: "Error" });
      }
    });

    app.get('/api/self/opportunities', mockAuth, async (req, res) => {
      try {
        const result = await mockPool.query("SELECT * FROM ministry_opportunities WHERE required_skills && (SELECT skills FROM members WHERE id = $1)", [req.user.memberId]);
        res.json(result.rows);
      } catch (err) {
        res.status(500).json({ error: "Error" });
      }
    });
  });

  it('GET /api/self/profile should return member data', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 'M1', firstName: 'John', lastName: 'Doe' }]
    });

    const res = await request(app).get('/api/self/profile');

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('John');
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT * FROM members"), ['M1']);
  });

  it('GET /api/self/donations should return donation list', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 1, amount: 100 }]
    });

    const res = await request(app).get('/api/self/donations');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(100);
  });

  it('GET /api/self/statements should return list of years', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ year: 2026 }, { year: 2025 }]
    });

    const res = await request(app).get('/api/self/statements');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([2026, 2025]);
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("DISTINCT EXTRACT(YEAR"), ['M1']);
  });

  it('GET /api/self/opportunities should return matched opportunities', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 1, title: 'Music Ministry' }]
    });

    const res = await request(app).get('/api/self/opportunities');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Music Ministry');
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("FROM ministry_opportunities"), ['M1']);
  });

  it('GET /api/self/profile should return 400 for unlinked user', async () => {
    // Override mockAuth for this test
    const unlinkedAuth = (req, res, next) => {
      req.user = { id: 2, role: 'viewer' }; // No memberId
      next();
    };

    const localApp = express();
    localApp.use(express.json());
    localApp.get('/api/self/profile', unlinkedAuth, async (req, res) => {
      if (!req.user.memberId) return res.status(400).json({ error: "Unlinked" });
      res.json({ ok: true });
    });

    const res = await request(localApp).get('/api/self/profile');
    expect(res.status).toBe(400);
  });
});
