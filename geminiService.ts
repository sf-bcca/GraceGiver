
import { GoogleGenAI } from "@google/genai";
import { Donation, Member } from "./types";

// Fixed: Always use process.env.API_KEY directly and ensure proper initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFinancialSummary = async (donations: Donation[], members: Member[]) => {
  // Fixed: Corrected the syntax error in the template literal interpolation for Unique Donors
  const prompt = `
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
      contents: prompt,
    });
    // Fixed: response.text is a property, not a method
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating analysis. Please try again later.";
  }
};
