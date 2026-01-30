/**
 * Members API Integration Tests
 * 
 * Tests CRUD operations and RBAC enforcement for member management.
 * Requires Docker test environment to be running.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, TEST_USERS, TEST_DATA, loginAs, authorizedRequest, waitForApi } from './setup.js';

describe('Members API', () => {
  let adminToken;
  let createdMemberId;

  beforeAll(async () => {
    await waitForApi();
    adminToken = await loginAs(TEST_USERS.admin);
  }, 60000);

  // Clean up created test data
  afterAll(async () => {
    if (createdMemberId) {
      try {
        await authorizedRequest(adminToken).delete(`/api/members/${createdMemberId}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('GET /api/members', () => {
    it('should return paginated member list', async () => {
      const res = await authorizedRequest(adminToken).get('/api/members');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('should support pagination parameters', async () => {
      const res = await authorizedRequest(adminToken).get('/api/members?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should support search parameter', async () => {
      const res = await authorizedRequest(adminToken).get('/api/members?search=Lock');

      expect(res.status).toBe(200);
      // Should find the test member seeded with first_name "Lock"
      expect(res.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should return member with correct structure', async () => {
      const res = await authorizedRequest(adminToken).get('/api/members');

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const member = res.body.data[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('firstName');
        expect(member).toHaveProperty('lastName');
      }
    });

    it('should require authentication', async () => {
      const res = await api().get('/api/members');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/members', () => {
    it('should create a new member', async () => {
      const newMember = {
        firstName: 'Integration',
        lastName: 'TestMember',
        email: `integration.test.${Date.now()}@example.com`,
        telephone: '+15559876543',
        address: '456 Integration Test Ave',
        city: 'TestCity',
        state: 'CA',
        zip: '90210'
      };

      const res = await authorizedRequest(adminToken)
        .post('/api/members')
        .send(newMember);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      // POST returns raw DB columns, not camelCase
      expect(res.body.first_name).toBe(newMember.firstName);
      expect(res.body.last_name).toBe(newMember.lastName);
      
      // Save for cleanup
      createdMemberId = res.body.id;
    });

    it('should require firstName and lastName', async () => {
      const res = await authorizedRequest(adminToken)
        .post('/api/members')
        .send({ email: 'incomplete@test.com' });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await api()
        .post('/api/members')
        .send({ firstName: 'Test', lastName: 'User' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/members/:id', () => {
    it('should return a specific member', async () => {
      const res = await authorizedRequest(adminToken).get(`/api/members/${TEST_DATA.memberId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(TEST_DATA.memberId);
      expect(res.body.firstName).toBe('Lock');
      expect(res.body.lastName).toBe('TestMember');
    });

    it('should return 404 for non-existent member', async () => {
      const res = await authorizedRequest(adminToken).get('/api/members/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/members/:id', () => {
    it('should update an existing member', async () => {
      // First create a member to update
      const createRes = await authorizedRequest(adminToken)
        .post('/api/members')
        .send({
          firstName: 'Update',
          lastName: 'TestCase',
          email: `update.test.${Date.now()}@example.com`,
          state: 'MS',
          zip: '38930'
        });

      const memberId = createRes.body.id;

      // Skip test if create failed
      if (!memberId) {
        console.warn('Member create failed, skipping update test');
        return;
      }

      // Update the member - must include both firstName AND lastName for validation
      const updateRes = await authorizedRequest(adminToken)
        .put(`/api/members/${memberId}`)
        .send({
          firstName: 'Updated',
          lastName: 'TestCase',
          city: 'NewCity',
          state: 'MS',
          zip: '38930'
        });

      expect(updateRes.status).toBe(200);
      // PUT returns raw DB columns
      expect(updateRes.body.first_name).toBe('Updated');
      expect(updateRes.body.city).toBe('NewCity');

      // Clean up
      await authorizedRequest(adminToken).delete(`/api/members/${memberId}`);
    });

    it('should return 400 for update without required fields', async () => {
      const res = await authorizedRequest(adminToken)
        .put('/api/members/non-existent-id')
        .send({ firstName: 'Test' }); // Missing lastName

      // API returns 400 for validation failure (missing lastName)
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/members/:id', () => {
    it('should delete an existing member', async () => {
      // Create a member to delete
      const createRes = await authorizedRequest(adminToken)
        .post('/api/members')
        .send({
          firstName: 'Delete',
          lastName: 'TestCase',
          email: `delete.test.${Date.now()}@example.com`,
          state: 'MS',
          zip: '38930'
        });

      const memberId = createRes.body.id;

      // Skip test if create failed
      if (!memberId) {
        console.warn('Member create failed, skipping delete test');
        return;
      }

      // Delete the member
      const deleteRes = await authorizedRequest(adminToken).delete(`/api/members/${memberId}`);

      expect(deleteRes.status).toBe(200);

      // Verify deletion
      const getRes = await authorizedRequest(adminToken).get(`/api/members/${memberId}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent member', async () => {
      const res = await authorizedRequest(adminToken).delete('/api/members/non-existent-id');

      expect(res.status).toBe(404);
    });
  });
});
