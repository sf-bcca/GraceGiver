/**
 * Integration Test Setup
 * 
 * Shared utilities for API integration tests.
 * These tests run against the Docker test environment (docker-compose.test.yml).
 */

import request from 'supertest';

// Test environment configuration
// When running locally, use port 3002 (docker-compose.test.yml api-test service)
// When running inside Docker, use http://api-test:3000
const API_URL = process.env.TEST_API_URL || 'http://localhost:3002';

// Test credentials from db/seed-test-users.sql
export const TEST_USERS = {
  admin: {
    username: 'testuser_a',
    password: 'TestPass123!',
    role: 'admin'
  },
  adminB: {
    username: 'testuser_b',
    password: 'TestPass123!',
    role: 'admin'
  }
};

// Pre-seeded test data IDs
export const TEST_DATA = {
  memberId: 'test-member-001'
};

/**
 * Create a supertest request instance
 */
export function api() {
  return request(API_URL);
}

/**
 * Login and return a token for the specified user
 * 
 * @param {object} user - User credentials { username, password }
 * @returns {Promise<string>} - JWT token
 */
export async function loginAs(user) {
  const res = await api()
    .post('/api/login')
    .send({ username: user.username, password: user.password });
  
  if (res.status !== 200) {
    throw new Error(`Login failed for ${user.username}: ${res.status} - ${JSON.stringify(res.body)}`);
  }
  
  return res.body.token;
}

/**
 * Create an authorized request helper
 * 
 * @param {string} token - JWT token
 */
export function authorizedRequest(token) {
  return {
    get: (path) => api().get(path).set('Authorization', `Bearer ${token}`),
    post: (path) => api().post(path).set('Authorization', `Bearer ${token}`),
    put: (path) => api().put(path).set('Authorization', `Bearer ${token}`),
    delete: (path) => api().delete(path).set('Authorization', `Bearer ${token}`)
  };
}

/**
 * Wait for the API server to be ready
 * Useful when starting up the Docker environment
 */
export async function waitForApi(maxWaitMs = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await api().get('/api/auth/password-policy');
      if (res.status === 200) {
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`API server not ready after ${maxWaitMs}ms`);
}
