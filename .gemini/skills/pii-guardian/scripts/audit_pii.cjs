#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('--- GraceGiver PII & Privacy Audit ---');

const PII_PATTERNS = [
  'console.log.*email',
  'console.log.*phone',
  'console.log.*address',
  'console.log.*amount',
  'dangerouslySetInnerHTML'
];

let issuesFound = 0;

PII_PATTERNS.forEach(pattern => {
  try {
    // Search in src and server directories
    const output = execSync(`grep -rnE "${pattern}" src/ server/ --exclude-dir=node_modules --exclude-dir=tests --exclude=mockData.ts || true`, { encoding: 'utf8' });
    if (output.trim()) {
      console.warn(`
⚠️  Potential Privacy Risk Found [Pattern: ${pattern}]:`);
      console.log(output);
      issuesFound++;
    }
  } catch (err) {
    // Grep returns non-zero if no matches, handled by '|| true'
  }
});

if (issuesFound === 0) {
  console.log('✅ No high-risk PII patterns detected in logs or unsafe React sinks.');
} else {
  console.log(`
❌ Found ${issuesFound} area(s) needing privacy review.`);
}

console.log('--------------------------------------');
