const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// OpenRouter AI Engine — replaces Gemini (Google Cloud / @google/genai) and local
// Gemma dual-engine chain. Uses OpenAI-compatible /v1/chat/completions API.
const { getFinancialSummary: openrouterGetFinancialSummary, generateMemberNarrative: openrouterGenerateNarrative, _setConfigForTest: setConfigForTest } = require('./openRouterService');

let genAI = null;

/**
 * @deprecated - Gemma inference removed. Uses openRouterService instead via aliases below.
 * Kept for backward compatibility if callers reference this function.
 */
const callGemma = async (prompt) => {
  throw new Error('callGemma is no longer used. Use openRouterService instead.');
};

/**
 * @deprecated - Gemini cloud inference removed. Uses openRouterService instead via aliases below.
 * Kept for backward compatibility if callers reference this function.
 */
const callGemini = async (prompt) => {
  throw new Error('callGemini is no longer used. Use openRouterService instead.');
};

/**
 * @deprecated - getAIClient removed since we no longer use the @google/genai SDK.
 * Kept for backward compatibility if callers reference this function.
 */
const getAIClient = () => {
  throw new Error('getAIClient is no longer used. Use openRouterService instead.');
};

/**
 * Delegate to openRouterService — same contract as geminiService.getFinancialSummary.
 * Falls back to default message on any error.
 */
const getFinancialSummary = async (donations, members) => {
  const result = await openrouterGetFinancialSummary(donations, members);
  return result || 'Financial analysis is currently unavailable.';
};

/**
 * Delegate to openRouterService — same contract as geminiService.generateMemberNarrative.
 * Falls back to default message on any error.
 */
const generateMemberNarrative = async (member, donations, year) => {
  const result = await openrouterGenerateNarrative(member, donations, year);
  return result || 'We appreciate your faithful support.';
};

/**
 * setGenAIInstance kept for backward compatibility — no-op now since we don't use @google/genai.
 */
const setGenAIInstance = (instance) => {
  genAI = instance;
};

module.exports = {
  getFinancialSummary,
  generateMemberNarrative,
  callGemma,     // deprecated
  callGemini,     // deprecated
  getAIClient,    // deprecated
  setGenAIInstance,
  setConfigForTest
};
