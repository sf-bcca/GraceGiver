// server/openRouterService.js — OpenRouter AI inference (OpenAI-compatible /v1/chat/completions)
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Config holder so tests can override env values without reloading .env.
 */
const config = {
  endpoint: process.env.OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions',
  model: process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it',
  timeoutSeconds: parseInt(process.env.AI_TIMEOUT, 10) || 20,
};

/**
 * Allow tests to override config (endpoint / model). Key is NOT overridable from here — that
 * stays as an env var guard in the service itself.
 */
const _setConfigForTest = (patch) => {
  Object.assign(config, patch);
};

const getApiKey = () => process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;

/**
 * Core inference call — returns text on success or null on any failure.
 * Uses AbortController for timeout safety and always cleans up the timer.
 */
const generateAI = async (prompt, options = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[AI] No OPENROUTER_API_KEY or AI_API_KEY configured.');
    return null;
  }

  try {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutSeconds * 1000);

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[AI OpenRouter] HTTP ${response.status}: ${body.slice(0, 256)}`);
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('[AI OpenRouter] Empty response.');
      return null;
    }

    console.log(`[AI OpenRouter] Success via ${config.model}`);
    return text;
  } catch (err) {
    console.error(`[AI OpenRouter] Failed (${err.message})`);
    return null;
  }
};

/** Parse an amount value safely — returns a finite number or 0. */
const safeAmount = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
};

/** Guard arrays before use. */
const toArray = (val) => (Array.isArray(val) ? val : []);

/**
 * Generate financial summary for dashboard — same contract as geminiService.getFinancialSummary.
 */
const getFinancialSummary = async (donations, members) => {
  const safeDons = toArray(donations);

  const totalAmount = safeDons.reduce((sum, d) => sum + safeAmount(d.amount), 0);
  const donorCount = new Set(
    safeDons.map(d => d?.member_id || d?.memberId).filter(Boolean)
  ).size;

  const fundBreakdown = safeDons.reduce((acc, d) => {
    const fund = d?.fund;
    acc[fund] = (acc[fund] || 0) + safeAmount(d.amount);
    return acc;
  }, {});

  const prompt = `Analyze the following church donation data and provide a concise strategic summary for the board.

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Total Donations: $${totalAmount.toLocaleString()}
Donation Count: ${safeDons.length}
Unique Donors: ${donorCount}

Funds breakdown:
${JSON.stringify(fundBreakdown, null, 2)}

Please provide:
1. A brief executive summary.
2. Key highlights or trends.
3. One strategic recommendation for increasing engagement or improving fund allocation.

Format the response as a clear, professional message.`;

  const result = await generateAI(prompt);
  return result || 'Financial analysis is currently unavailable.';
};

/** Clean conversational preambles and meta-text from generated AI narrative. */
const cleanNarrative = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  let cleaned = text.trim();
  
  // Remove wrapping quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Strip introductory meta phrases like "Here's a narrative...", "Certainly...", "Sure, ..."
  cleaned = cleaned.replace(/^(?:Here's|Here is|Certainly|Sure|Below is|This is)[^:\n]*:\s*/i, '');
  
  // Re-strip wrapping quotes if present after removing meta phrase
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned.trim();
};

/**
 * Generate personalized narrative for member annual statement — same contract as geminiService.generateMemberNarrative.
 */
const generateMemberNarrative = async (member, donations, year) => {
  const safeDons = toArray(donations);
  const totalAmount = safeDons.reduce((sum, d) => sum + safeAmount(d.amount), 0);

  const breakdown = safeDons.reduce((acc, d) => {
    acc[d?.fund] = (acc[d?.fund] || 0) + safeAmount(d.amount);
    return acc;
  }, {});

  const firstName = member?.firstName ?? 'a valued member';
  const lastName = member?.lastName ?? '';

  const systemPrompt = `You are a pastoral stewardship assistant writing official annual contribution statements. Output ONLY the clean pastoral narrative text itself. Never include introductory headers, conversational preambles, greetings to the developer, meta-commentary, markdown formatting, or quotes.`;

  const prompt = `Write a short, encouraging narrative for a church member's annual contribution statement:

Member Name: ${firstName} ${lastName}
Year: ${year || new Date().getFullYear()}
Total Giving: $${totalAmount.toLocaleString()}

Giving Breakdown:
${JSON.stringify(breakdown, null, 2)}

Guidelines:
- Tone: Grateful, pastoral and encouraging.
- Length: 2-3 sentences max.
- Mention specific funds they supported if significant.
- Focus on the impact of their generosity.
- CRITICAL: Output ONLY the thank-you narrative paragraph itself to be printed on the official statement. Never start with "Here is...", "Here's...", or any conversational introductory preamble.`;

  const result = await generateAI(prompt, { systemPrompt });
  const cleaned = cleanNarrative(result);
  return cleaned || 'We appreciate your faithful support.';
};

module.exports = { getFinancialSummary, generateMemberNarrative, _setConfigForTest };

