/**
 * Guest Reports & Export Integration Tests
 *
 * Verifies that guest donations (memberId: null) are included when exporting data or generating statements.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, TEST_USERS, loginAs, authorizedRequest, waitForApi } from './setup.js';

describe('Guest Donations Export & Reports', () => {
  let adminToken;
  let createdGuestDonationId;
  const currentYear = new Date().getFullYear();

  beforeAll(async () => {
    await waitForApi();
    adminToken = await loginAs(TEST_USERS.admin);

    // Create a guest donation
    const res = await authorizedRequest(adminToken)
      .post('/api/donations')
      .send({
        memberId: 'guest',
        amount: 123.45,
        fund: 'General',
        notes: 'Unique Guest Test Donation For Export',
        donationDate: new Date().toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdGuestDonationId = res.body.id;
  }, 60000);

  afterAll(async () => {
    if (createdGuestDonationId) {
      try {
        await authorizedRequest(adminToken).delete(`/api/donations/${createdGuestDonationId}`);
      } catch (e) {
        // Cleanup error ignored
      }
    }
  });

  it('should include guest donation in /api/export/donations JSON export', async () => {
    const res = await authorizedRequest(adminToken)
      .get(`/api/export/donations?format=json`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const guestDonation = res.body.find((d) => d.id.toString() === createdGuestDonationId.toString());
    expect(guestDonation).toBeDefined();
    expect(guestDonation.first_name).toBe('Guest');
    expect(guestDonation.last_name).toBe('Non-Member');
    expect(parseFloat(guestDonation.amount)).toBe(123.45);
  });

  it('should include guest donation in /api/export/donations CSV export', async () => {
    const res = await authorizedRequest(adminToken)
      .get(`/api/export/donations?format=csv`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Guest');
    expect(res.text).toContain('Non-Member');
    expect(res.text).toContain('123.45');
  });

  it('should include guest donation in /api/reports/export CSV', async () => {
    const res = await authorizedRequest(adminToken)
      .get(`/api/reports/export?year=${currentYear}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Guest');
    expect(res.text).toContain('Non-Member');
    expect(res.text).toContain('123.45');
  });

  it('should include guest contributions in batch PDF statement', async () => {
    const res = await authorizedRequest(adminToken)
      .get(`/api/reports/statements?year=${currentYear}`)
      .buffer(true)
      .parse((res, callback) => {
        res.setEncoding('binary');
        res.data = '';
        res.on('data', (chunk) => {
          res.data += chunk;
        });
        res.on('end', () => {
          callback(null, Buffer.from(res.data, 'binary'));
        });
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('application/pdf');
    expect(res.body.length).toBeGreaterThan(0);
  });
});
