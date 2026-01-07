/**
 * Authentication API Integration Tests
 * 
 * Tests login flow, token validation, and account lockout.
 * Requires Docker test environment to be running.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { api, TEST_USERS, loginAs, waitForApi } from './setup.js';

describe('Authentication API', () => {
  // Wait for API to be ready before running tests
  beforeAll(async () => {
    await waitForApi();
  }, 60000);

  describe('POST /api/login', () => {
    it('should login with valid credentials', async () => {
      const res = await api()
        .post('/api/login')
        .send({ 
          username: TEST_USERS.admin.username, 
          password: TEST_USERS.admin.password 
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(TEST_USERS.admin.username);
      expect(res.body.user.role).toBe('admin');
    });

    it('should return user permissions in response', async () => {
      const res = await api()
        .post('/api/login')
        .send({ 
          username: TEST_USERS.admin.username, 
          password: TEST_USERS.admin.password 
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('permissions');
      expect(Array.isArray(res.body.user.permissions)).toBe(true);
    });

    it('should reject invalid username', async () => {
      const res = await api()
        .post('/api/login')
        .send({ 
          username: 'nonexistent_user', 
          password: 'anypassword' 
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject invalid password', async () => {
      const res = await api()
        .post('/api/login')
        .send({ 
          username: TEST_USERS.admin.username, 
          password: 'wrongpassword' 
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject empty credentials', async () => {
      const res = await api()
        .post('/api/login')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/password-policy', () => {
    it('should return password policy without authentication', async () => {
      const res = await api().get('/api/auth/password-policy');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('minLength');
      expect(res.body).toHaveProperty('requireUppercase');
      expect(res.body).toHaveProperty('requireLowercase');
      expect(res.body).toHaveProperty('requireDigit');
      expect(res.body).toHaveProperty('requireSpecial');
    });
  });

  describe('POST /api/auth/validate-password', () => {
    it('should validate weak password', async () => {
      const res = await api()
        .post('/api/auth/validate-password')
        .send({ password: 'weak' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meetsRequirements');
      expect(res.body.meetsRequirements).toBe(false);
    });

    it('should validate strong password', async () => {
      const res = await api()
        .post('/api/auth/validate-password')
        .send({ password: 'StrongPass123!@#' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meetsRequirements');
      expect(res.body.meetsRequirements).toBe(true);
      expect(res.body).toHaveProperty('strength');
      expect(res.body).toHaveProperty('strengthLabel');
    });
  });

  describe('Token Authentication', () => {
    it('should access protected endpoint with valid token', async () => {
      const token = await loginAs(TEST_USERS.admin);
      
      const res = await api()
        .get('/api/members')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should reject request without token', async () => {
      const res = await api().get('/api/members');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const res = await api()
        .get('/api/members')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject request with malformed authorization header', async () => {
      const res = await api()
        .get('/api/members')
        .set('Authorization', 'NotBearer token');

      // The token extraction splits on space and takes [1], so 'token' is passed to verify
      // which fails with INVALID_TOKEN (403)
      expect(res.status).toBe(403);
    });
  });
});
