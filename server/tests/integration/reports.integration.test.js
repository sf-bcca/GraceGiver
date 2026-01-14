/**
 * Reports API Integration Tests
 * 
 * Tests generation of member statements and other reports.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, TEST_USERS, TEST_DATA, loginAs, authorizedRequest, waitForApi } from './setup.js';

describe('Reports API', () => {
  let adminToken;
  let createdDonationIds = [];
  const reportYear = 2025;

  beforeAll(async () => {
    await waitForApi();
    adminToken = await loginAs(TEST_USERS.admin);

    // Create test donations for the specific year
    const donations = [
      {
        memberId: TEST_DATA.memberId,
        amount: 100.00,
        fund: 'Tithes',
        notes: 'Report Test 1',
        date: `${reportYear}-01-15`
      },
      {
        memberId: TEST_DATA.memberId,
        amount: 50.00,
        fund: 'Missions',
        notes: 'Report Test 2',
        date: `${reportYear}-06-20`
      },
      // Donation in a different year (should not appear)
      {
        memberId: TEST_DATA.memberId,
        amount: 75.00,
        fund: 'Tithes',
        notes: 'Report Test Different Year',
        date: `${reportYear - 1}-12-25`
      }
    ];

    for (const d of donations) {
      const res = await authorizedRequest(adminToken)
        .post('/api/donations')
        .send(d);
      
      if (res.body.id) {
        createdDonationIds.push(res.body.id);
      }
    }
  }, 60000);

  afterAll(async () => {
    // Clean up created donations
    for (const id of createdDonationIds) {
      try {
        await authorizedRequest(adminToken).delete(`/api/donations/${id}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('GET /api/reports/member-statement/:id', () => {
    it('should return member statement data for a specific year', async () => {
      const res = await authorizedRequest(adminToken)
        .get(`/api/reports/member-statement/${TEST_DATA.memberId}?year=${reportYear}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('member');
      expect(res.body.member).toHaveProperty('id', TEST_DATA.memberId);
      expect(res.body).toHaveProperty('donations');
      expect(Array.isArray(res.body.donations)).toBe(true);
      
      // Should verify that we only got donations for the requested year
      const donations = res.body.donations;
      expect(donations.length).toBeGreaterThanOrEqual(2);
      
      // Verify totals
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('totalAmount');
      expect(res.body.summary).toHaveProperty('year', parseInt(reportYear));
    });

    it('should require authentication', async () => {
      const res = await api().get(`/api/reports/member-statement/${TEST_DATA.memberId}?year=${reportYear}`);
      expect(res.status).toBe(401);
    });

    it('should require valid member ID', async () => {
      const res = await authorizedRequest(adminToken)
        .get(`/api/reports/member-statement/non-existent-id?year=${reportYear}`);
      
      // Depending on implementation, could be 404 or empty list. 
      // Assuming 404 if member not found.
      expect(res.status).toBe(404);
    });
  });
});
