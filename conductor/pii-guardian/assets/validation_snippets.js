/**
 * PII Guardian: Validation Snippets
 * Use these snippets when building new forms or API endpoints.
 */

// 1. Frontend Masking (React)
const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

// 2. Server-side Sanitization
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, ''); // Simple XSS prevention
};

// 3. E.164 Phone Formatting
const formatE164 = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`; // Default to US
};

module.exports = {
  maskEmail,
  sanitizeString,
  formatE164
};
