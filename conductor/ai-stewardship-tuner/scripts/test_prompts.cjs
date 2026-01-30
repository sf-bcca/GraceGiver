#!/usr/bin/env node

/**
 * AI Stewardship Tuner: Prompt Tester
 * Tests the Gemini prompts against local mock data.
 * Requires GEMINI_API_KEY in environment.
 */

const { getFinancialSummary, generateMemberNarrative } = require('../../../server/geminiService');
const { members, donations } = require('../../../mockData');

async function testBoardSummary() {
  console.log('--- Testing Board Financial Summary ---');
  // Use first 50 donations for a sample
  const sampleDonations = donations.slice(0, 50);
  const result = await getFinancialSummary(sampleDonations, members);
  console.log('AI Response:\n', result);
  console.log('\n---------------------------------------\n');
}

async function testMemberNarrative() {
  console.log('--- Testing Member Stewardship Narrative ---');
  const sampleMember = members[0];
  const memberDonations = donations.filter(d => d.memberId === sampleMember.id);
  
  const result = await generateMemberNarrative(sampleMember, memberDonations, 2025);
  console.log(`Member: ${sampleMember.firstName} ${sampleMember.lastName}`);
  console.log('AI Response:\n', result);
  console.log('\n---------------------------------------\n');
}

async function runTests() {
  if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    console.error('Error: GEMINI_API_KEY is not set.');
    process.exit(1);
  }

  try {
    await testBoardSummary();
    await testMemberNarrative();
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

runTests();
