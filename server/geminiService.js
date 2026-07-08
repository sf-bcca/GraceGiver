const { GoogleGenAI } = require("@google/genai");
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMMA_ENDPOINT = process.env.GEMMA_ENDPOINT || "http://100.115.102.53:8080/v1/chat/completions";
const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-E4B-it.litertlm";

// Instantiate lazily
let genAI = null;

const getAIClient = () => {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key missing. Cloud fallback will be unavailable.");
    return null;
  }
  // vertexai: false is REQUIRED for API key usage with preview models in @google/genai
  genAI = new GoogleGenAI({ apiKey, vertexai: false });
  return genAI;
};

/**
 * Call the local Gemma 4 Inference engine on Proxmox (preferred over cloud)
 */
const callGemma = async (prompt) => {
  console.log(`[AI] Attempting local inference via Gemma 4 (${GEMMA_MODEL})...`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s local timeout

    const response = await fetch(GEMMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Gemma");
    
    console.log("[AI] Gemma inference successful.");
    return text;
  } catch (error) {
    console.error("[AI] Gemma 4 failed:", error.message);
    throw error;
  }
};

/**
 * Call Gemini 3.1 (Cloud - last resort due to API costs)
 */
const callGemini = async (prompt) => {
  console.log(`[AI] Attempting cloud inference via Gemini (${GEMINI_MODEL})...`);
  const ai = getAIClient();
  if (!ai) throw new Error("Gemini client not initialized (missing API key)");

  try {
    const generatePromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    // 10s timeout for Gemini
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out after 10s")), 10000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    
    // In newer SDK, text is a property. In older ones, it might be a function. 
    // The test mock uses a property. Let's handle both.
    const text = typeof response.text === 'function' ? response.text() : response.text;
    
    console.log("[AI] Gemini inference successful.");
    return text;
  } catch (error) {
    console.error("[AI] Gemini failed:", error.message);
    throw error;
  }
};

const getFinancialSummary = async (donations, members) => {
  const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const donorCount = new Set(donations.map(d => d.member_id || d.memberId)).size;

  const promptText = `
    Analyze the following church donation data and provide a concise strategic summary for the board.
    
    Date: ${new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
    Total Donations: $${totalAmount.toLocaleString()}
    Donation Count: ${donations.length}
    Unique Donors: ${donorCount}
    
    Funds breakdown:
    ${JSON.stringify(donations.reduce((acc, d) => {
      const fund = d.fund;
      acc[fund] = (acc[fund] || 0) + parseFloat(d.amount);
      return acc;
    }, {}), null, 2)}

    Please provide:
    1. A brief executive summary.
    2. Key highlights or trends.
    3. One strategic recommendation for increasing engagement or improving fund allocation.
    
    Format the response as a clear, professional message.
  `;

  // Strategy: Gemma (local network) -> Gemini (cloud last resort)
  try {
    return await callGemma(promptText);
  } catch (err) {
    console.warn("[AI] Gemma failed, falling back to cloud:", err.message);
    try {
      return await callGemini(promptText);
    } catch (geminiErr) {
      console.error("[AI] AI processing unavailable.");
      return "Financial analysis is currently unavailable.";
    }
  }
};

const generateMemberNarrative = async (member, donations, year) => {
  const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const breakdown = donations.reduce((acc, d) => {
    const fund = d.fund;
    acc[fund] = (acc[fund] || 0) + parseFloat(d.amount);
    return acc;
  }, {});

  const promptText = `
    Write a short, encouraging, and personalized narrative for a church member's annual contribution statement.
    
    Member Name: ${member.firstName} ${member.lastName}
    Year: ${year}
    Total Giving: $${totalAmount.toLocaleString()}
    
    Giving Breakdown:
    ${JSON.stringify(breakdown, null, 2)}
    
    Guidelines:
    - Tone: Grateful, spiritual, and encouraging.
    - Length: 2-3 sentences max.
    - Mention specific funds they supported if significant.
    - Do NOT mention tax deductibility details here (that's handled elsewhere).
    - Focus on the impact of their generosity.
  `;

  // Strategy: Gemma (local network) -> Gemini (cloud last resort)
  try {
    return await callGemma(promptText);
  } catch (err) {
    console.warn("[AI] Gemma failed, falling back to cloud:", err.message);
    try {
      return await callGemini(promptText);
    } catch (geminiErr) {
      return "We appreciate your faithful support.";
    }
  }
};

const setGenAIInstance = (instance) => {
  genAI = instance;
};

module.exports = {
  getFinancialSummary,
  generateMemberNarrative,
  setGenAIInstance
};
