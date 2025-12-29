/**
 * Data Validation Utilities for GraceGiver
 * Authoritative source for data integrity rules.
 */

const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  ZIP: /^\d{5}(-\d{4})?$/,
  STATE: /^[A-Z]{2}$/
};

/**
 * Validates a member object against the defined standards.
 * @param {Object} member - The member data to validate.
 * @returns {Object} result - { isValid: boolean, errors: Array }
 */
function validateMember(member) {
  const errors = [];

  // Email Validation
  if (member.email && !REGEX.EMAIL.test(member.email)) {
    errors.push('INVALID_EMAIL: Must be a valid RFC 5322 email address.');
  } else if (member.email && member.email.length > 254) {
    errors.push('INVALID_EMAIL_LENGTH: Email cannot exceed 254 characters.');
  }

  // Telephone validation (E.164 format)
  if (member.telephone && !REGEX.PHONE.test(member.telephone)) {
    errors.push('INVALID_TELEPHONE: Must be a valid E.164 format phone number (e.g., +14155552671).');
  }

  // Zip Code Validation
  if (!member.zip || !REGEX.ZIP.test(member.zip)) {
    errors.push('INVALID_ZIP: Zip code must be 5 digits (12345) or ZIP+4 (12345-6789).');
  }

  // State Validation
  if (!member.state || !REGEX.STATE.test(member.state)) {
    errors.push('INVALID_STATE: State must be a 2-character uppercase abbreviation.');
  }

  // Basic required field checks
  if (!member.firstName || member.firstName.trim().length === 0) {
    errors.push('REQUIRED_FIRST_NAME: First name is mandatory.');
  }
  if (!member.lastName || member.lastName.trim().length === 0) {
    errors.push('REQUIRED_LAST_NAME: Last name is mandatory.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateMember,
  REGEX
};
