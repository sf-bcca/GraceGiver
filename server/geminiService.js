const { GoogleGenAI } = require("@google/genai");

// Instantiate lazily to prevent boot crash if key is missing
let genAI = null;

const getAIClient = () => {
  if (genAI) return genAI;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  
  genAI = new GoogleGenAI({ apiKey });
  return genAI;
};

const getFinancialSummary = async (donations, members) => {
  const ai = getAIClient();
  if (!ai) return "AI analysis is currently unavailable (missing API Key).";

  const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const donorCount = new Set(donations.map(d => d.member_id || d.memberId)).size;

  const promptText = `
    Analyze the following church donation data and provide a concise strategic summary for the board.
    
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite", 
      contents: promptText
    });
    
    // Handle response.text() whether it's a function (SDK v1) or property
    const text = typeof response.text === 'function' ? response.text() : response.text;
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating analysis. Please try again later.";
  }
};

const generateMemberNarrative = async (member, donations, year) => {
  const ai = getAIClient();
  if (!ai) return "AI narrative is currently unavailable (missing API Key).";

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite", 
      contents: promptText
    });

    // Handle response.text() whether it's a function (SDK v1) or property
    const text = typeof response.text === 'function' ? response.text() : response.text;
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating narrative. We appreciate your faithful support.";
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
