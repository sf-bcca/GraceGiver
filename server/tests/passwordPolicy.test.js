/**
 * Password Policy Unit Tests
 * 
 * Tests for password validation, strength calculation, and expiry logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validatePasswordPolicy,
  checkPasswordExpiry,
  getPasswordPolicy,
  config
} from '../passwordPolicy.js';

// ============================================================================
// validatePasswordPolicy Tests
// ============================================================================
describe('validatePasswordPolicy', () => {
  describe('valid passwords', () => {
    it('should accept password meeting all requirements', () => {
      const result = validatePasswordPolicy('SecurePass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept longer passwords with higher strength', () => {
      const result = validatePasswordPolicy('VerySecurePassword2024!@#');
      expect(result.valid).toBe(true);
      expect(result.strength).toBeGreaterThan(70);
    });
  });

  describe('length requirements', () => {
    it('should reject password shorter than minimum length', () => {
      const result = validatePasswordPolicy('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Password must be at least ${config.minLength} characters long`
      );
    });

    it('should accept password at exactly minimum length', () => {
      // Create password at exactly minLength with all requirements
      const password = 'Aa1!' + 'x'.repeat(config.minLength - 4);
      const result = validatePasswordPolicy(password);
      expect(result.valid).toBe(true);
    });
  });

  describe('uppercase requirement', () => {
    it('should reject password without uppercase', () => {
      const result = validatePasswordPolicy('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });
  });

  describe('lowercase requirement', () => {
    it('should reject password without lowercase', () => {
      const result = validatePasswordPolicy('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });
  });

  describe('digit requirement', () => {
    it('should reject password without digit', () => {
      const result = validatePasswordPolicy('NoDigitsHere!!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one digit'
      );
    });
  });

  describe('special character requirement', () => {
    it('should reject password without special character', () => {
      const result = validatePasswordPolicy('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      );
    });

    it('should accept various special characters', () => {
      const specials = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '+', '=', '[', ']', '{', '}', '|', ':', "'", '"', ',', '.', '<', '>', '/', '?', '\\'];
      
      for (const char of specials) {
        const password = `SecurePass123${char}`;
        const result = validatePasswordPolicy(password);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('multiple violations', () => {
    it('should report all violations', () => {
      const result = validatePasswordPolicy('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('empty/null password', () => {
    it('should reject empty password', () => {
      const result = validatePasswordPolicy('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject null password', () => {
      const result = validatePasswordPolicy(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject undefined password', () => {
      const result = validatePasswordPolicy(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('strength calculation', () => {
    it('should return 0 strength for empty password', () => {
      const result = validatePasswordPolicy('');
      expect(result.strength).toBe(0);
    });

    it('should increase strength for longer passwords', () => {
      const short = validatePasswordPolicy('Aa1!xxxxxxxx');
      const medium = validatePasswordPolicy('Aa1!xxxxxxxxxxxxxxxx');
      
      expect(medium.strength).toBeGreaterThan(short.strength);
    });

    it('should return strength label', () => {
      const result = validatePasswordPolicy('SecurePass123!');
      expect(result.strengthLabel).toBeDefined();
      expect(['Weak', 'Fair', 'Good', 'Strong', 'Excellent']).toContain(result.strengthLabel);
    });
  });
});

// ============================================================================
// checkPasswordExpiry Tests
// ============================================================================
describe('checkPasswordExpiry', () => {
  describe('when expiry is disabled (0 days)', () => {
    it('should return expired: false with expiryEnabled: false', () => {
      // Default config has expiryDays = 0
      const result = checkPasswordExpiry(new Date());
      
      expect(result.expired).toBe(false);
      expect(result.expiryEnabled).toBe(false);
      expect(result.daysRemaining).toBeNull();
    });
  });

  describe('when expiry is enabled', () => {
    let originalExpiryDays;

    beforeEach(() => {
      originalExpiryDays = config.expiryDays;
      config.expiryDays = 90; // Enable 90-day expiry for tests
    });

    afterEach(() => {
      config.expiryDays = originalExpiryDays;
    });

    it('should return expired: false for recent password change', () => {
      const recentChange = new Date();
      const result = checkPasswordExpiry(recentChange);
      
      expect(result.expired).toBe(false);
      expect(result.expiryEnabled).toBe(true);
      expect(result.daysRemaining).toBe(90);
    });

    it('should return expired: true for old password', () => {
      const oldChange = new Date();
      oldChange.setDate(oldChange.getDate() - 100);
      
      const result = checkPasswordExpiry(oldChange);
      
      expect(result.expired).toBe(true);
      expect(result.expiryEnabled).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });

    it('should calculate correct days remaining', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = checkPasswordExpiry(thirtyDaysAgo);
      
      expect(result.expired).toBe(false);
      expect(result.daysRemaining).toBe(60);
    });

    it('should return expired: true for null passwordChangedAt', () => {
      const result = checkPasswordExpiry(null);
      
      expect(result.expired).toBe(true);
      expect(result.expiryEnabled).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });

    it('should include expiresAt date', () => {
      const recentChange = new Date();
      const result = checkPasswordExpiry(recentChange);
      
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt instanceof Date).toBe(true);
    });
  });
});

// ============================================================================
// getPasswordPolicy Tests
// ============================================================================
describe('getPasswordPolicy', () => {
  it('should return all policy settings', () => {
    const policy = getPasswordPolicy();
    
    expect(policy).toHaveProperty('minLength');
    expect(policy).toHaveProperty('requireUppercase');
    expect(policy).toHaveProperty('requireLowercase');
    expect(policy).toHaveProperty('requireDigit');
    expect(policy).toHaveProperty('requireSpecial');
    expect(policy).toHaveProperty('expiryDays');
    expect(policy).toHaveProperty('expiryEnabled');
    expect(policy).toHaveProperty('historyCount');
  });

  it('should match config values', () => {
    const policy = getPasswordPolicy();
    
    expect(policy.minLength).toBe(config.minLength);
    expect(policy.requireUppercase).toBe(config.requireUppercase);
    expect(policy.requireLowercase).toBe(config.requireLowercase);
    expect(policy.requireDigit).toBe(config.requireDigit);
    expect(policy.requireSpecial).toBe(config.requireSpecial);
    expect(policy.expiryDays).toBe(config.expiryDays);
    expect(policy.historyCount).toBe(config.historyCount);
  });

  it('should have expiryEnabled based on expiryDays', () => {
    const policy = getPasswordPolicy();
    
    expect(policy.expiryEnabled).toBe(config.expiryDays > 0);
  });
});

// ============================================================================
// Config Defaults Tests
// ============================================================================
describe('config defaults', () => {
  it('should have sensible defaults', () => {
    expect(config.minLength).toBeGreaterThanOrEqual(8);
    expect(config.requireUppercase).toBe(true);
    expect(config.requireLowercase).toBe(true);
    expect(config.requireDigit).toBe(true);
    expect(config.requireSpecial).toBe(true);
  });

  it('should have non-negative historyCount', () => {
    expect(config.historyCount).toBeGreaterThanOrEqual(0);
  });
});
