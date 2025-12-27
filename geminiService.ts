import { GoogleGenAI } from "@google/genai";
import { Donation, Member } from "./types";

// Fixed: Instantiate lazily to prevent boot crash if key is missing
let genAI: any = null;

const getAIClient = () => {
  if (genAI) return genAI;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  
  // Use the correct constructor format: { apiKey: string }
  genAI = new GoogleGenAI({ apiKey });
  return genAI;
};

export const getFinancialSummary = async (donations: Donation[], members: Member[]) => {
  const ai = getAIClient();
  if (!ai) return "AI analysis is currently unavailable (missing API Key).";

  const promptText = `
    Analyze the following church donation data and provide a concise strategic summary for the board.
    
    Total Donations: ${donations.reduce((sum, d) => sum + d.amount, 0)}
    Donation Count: ${donations.length}
    Unique Donors: ${new Set(donations.map(d => d.memberId)).size}
    
    Funds breakdown:
    ${JSON.stringify(donations.reduce((acc: any, d) => {
      acc[d.fund] = (acc[d.fund] || 0) + d.amount;
      return acc;
    }, {}))}

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
