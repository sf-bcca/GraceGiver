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
      model: "gemini-3-flash-preview", 
      contents: promptText
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating analysis. Please try again later.";
  }
};

module.exports = {
  getFinancialSummary
};
