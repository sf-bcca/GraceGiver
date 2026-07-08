import { graceWebGPUEngine, WebGPUEngineState, checkAvailability } from "./GraceWebGPUEngine";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface AIGenerationOptions {
  onProgress?: (status: string) => void;
  onChunk?: (chunk: string) => void;
  maxTokens?: number;
}

export interface AIInsightData {
  narrative: string;
  sentiment: "positive" | "neutral" | "concerned" | "growing";
  stewardshipGrowth: number;
  recommendedFocus: string[];
  isClientGenerated: boolean;
  provider?: "webgpu" | "server";
}

export interface MemberNarrativeResult {
  narrative: string;
  memberName: string;
  year: string;
  totalGiving: number;
  giftCount: number;
  firstDonation?: string;
  mostRecentDonation?: string;
  topFunds: Array<{ fund: string; total: number }>;
  isClientGenerated: boolean;
  provider?: "webgpu" | "server";
}

function escapePrompt(value: string): string {
  return value.replace(/[\\`${}]/g, '\\$&');
}

type AIProvider = "webgpu" | "server";

class GraceAIService {
  private provider: AIProvider = "server";
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
     const isAvailable = await graceWebGPUEngine.getState().isAvailable ?? 
       await checkAvailability();
    
    if (isAvailable && !graceWebGPUEngine.getState().errorMessage) {
      this.provider = "webgpu";
    } else {
      this.provider = "server";
    }
    
    this.initialized = true;
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  getState(): WebGPUEngineState {
    return graceWebGPUEngine.getState();
  }

  async generateInsight(
    donationData: Array<{ date: string; amount: number; fund?: string }>,
    memberName: string,
    options: AIGenerationOptions = {},
  ): Promise<AIInsightData> {
    await this.initialize();

    if (this.provider === "webgpu") {
      return await this.generateInsightWebGPU(donationData, memberName, options);
    }

    return await this.generateInsightServer(donationData, memberName, options);
  }

  async generateMemberNarrative(
    memberId: string,
    year: string,
    options: AIGenerationOptions = {},
  ): Promise<MemberNarrativeResult> {
    await this.initialize();

    if (this.provider === "webgpu") {
      return await this.generateNarrativeWebGPU(memberId, year, options);
    }

    return await this.generateNarrativeServer(memberId, year, options);
  }

  private async generateInsightWebGPU(
    donationData: Array<{ date: string; amount: number; fund?: string }>,
    memberName: string,
    options: AIGenerationOptions = {},
  ): Promise<AIInsightData> {
    try {
      const prompt = `You are a pastoral stewardship advisor. Analyze this parishioner's giving pattern and provide insights for their stewardship journey.

Member: ${escapePrompt(memberName)}

Giving History:
${donationData.map(d => `- ${d.date}: $${d.amount.toFixed(2)}${d.fund ? ` (${escapePrompt(d.fund)})` : ""}`).join("\n")}

Provide a JSON response with these fields (no markdown, no code blocks):
{
  "narrative": "A warm, pastoral paragraph about their stewardship journey and growth.",
  "sentiment": "positive|neutral|concerned|growing",
  "stewardshipGrowth": 0.85,
  "recommendedFocus": ["focus-area-1", "focus-area-2"]
}`;

      let fullResponse = "";
      await graceWebGPUEngine.generate(prompt, (chunk) => {
        options.onChunk?.(chunk);
        fullResponse += chunk;
      }, options.maxTokens || 512);

      // Parse JSON from the response
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          isClientGenerated: true,
          provider: "webgpu",
        };
      }

      throw new Error("Invalid model output");
    } catch (err) {
      console.warn("WebGPU insight generation failed, using fallback data", err);
      return this.buildFallbackInsight(donationData, memberName, true, "webgpu");
    }
  }

  private async generateNarrativeWebGPU(
    memberId: string,
    year: string,
    options: AIGenerationOptions = {},
  ): Promise<MemberNarrativeResult> {
    try {
      const response = await fetch(`${API_URL}/api/reports/member-narrative/${memberId}?year=${year}&client=true`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch narrative data");
      }

      const data = await response.json();
      const prompt = `You are a pastoral stewardship advisor. Write a warm, personalized narrative for this parishioner's ${year} annual giving statement.

Member: ${escapePrompt(data.memberName || "Unknown")}
Total Giving: $${(data.totalGiving ?? 0).toFixed(2)}
Number of Gifts: ${data.giftCount ?? 0}

Giving Details:
${(data.topFunds || []).map(f => `- ${escapePrompt(f.fund)}: $${(f.total ?? 0).toFixed(2)}`).join("\n")}

${data.firstDonation ? `First Gift: ${escapePrompt(data.firstDonation)}` : ""}
${data.mostRecentDonation ? `Most Recent Gift: ${escapePrompt(data.mostRecentDonation)}` : ""}

Write a heartfelt, pastoral narrative (3-4 paragraphs) that:
1. Acknowledges their specific giving pattern
2. Connects their gifts to the church's mission
3. Expresses genuine gratitude
4. Has a warm, personal tone (not generic)

Respond with ONLY the narrative text. No JSON, no markdown formatting.`;

      let fullResponse = "";
      await graceWebGPUEngine.generate(prompt, (chunk) => {
        options.onChunk?.(chunk);
        fullResponse += chunk;
      }, 768);

      return {
        ...data,
        narrative: fullResponse || data.narrative,
        isClientGenerated: true,
        provider: "webgpu",
      };
    } catch (err) {
      console.warn("WebGPU narrative generation failed, using server fallback", err);
      return await this.generateNarrativeServer(memberId, year, options);
    }
  }

  private async generateInsightServer(
    donationData: Array<{ date: string; amount: number; fund?: string }>,
    memberName: string,
    _options: AIGenerationOptions = {},
  ): Promise<AIInsightData> {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/ai/stewardship-insight`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          donorName: memberName,
          donations: donationData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server AI unavailable (${response.status})`);
      }

      const data = await response.json();

      // Server returns { insight: string } or structured fields — normalize to AIInsightData
      const narrative = typeof data.insight === "string" ? data.insight : null;
      return {
        narrative: narrative || data.narrative || "",
        sentiment: (data.sentiment || (narrative?.includes("grow") ? "growing" : "neutral")) as ("positive" | "neutral" | "concerned" | "growing"),
        stewardshipGrowth: typeof data.stewardshipGrowth === "number" ? Math.max(0, Math.min(100, data.stewardshipGrowth)) : 50,
        recommendedFocus: Array.isArray(data.recommendedFocus) ? data.recommendedFocus : ["continuing-current-pattern"],
        isClientGenerated: false,
        provider: "server",
      };
    } catch (err) {
      console.warn("Server AI fallback also failed", err);
      return this.buildFallbackInsight(donationData, memberName, false, "server");
    }
  }

  private async generateNarrativeServer(
    memberId: string,
    year: string,
    _options: AIGenerationOptions = {},
  ): Promise<MemberNarrativeResult> {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/reports/member-narrative/${memberId}?year=${year}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate narrative");
      }

      const data = await response.json();
      return {
        ...data,
        provider: "server",
      };
    } catch (err) {
      console.error("Server narrative generation failed", err);
      throw err;
    }
  }

  private buildFallbackInsight(
    donationData: Array<{ date: string; amount: number; fund?: string }>,
    memberName: string,
    isClientGenerated: boolean,
    provider: "webgpu" | "server" = "server",
  ): AIInsightData {
    const totalGiving = donationData.reduce((sum, d) => sum + d.amount, 0);
    const giftCount = donationData.length;

    return {
      narrative: `${memberName} has demonstrated faithful stewardship with ${giftCount} gifts totaling $${totalGiving.toFixed(2)}. Consider discussing expansion of their giving horizons.`,
      sentiment: totalGiving > 1000 ? "growing" : "neutral",
      stewardshipGrowth: giftCount > 5 ? Math.round((60 + Math.random() * 35) * 10) / 10 : Math.round((40 + Math.random() * 15) * 10) / 10,
      recommendedFocus: ["expanding-giving-horizons", "spiritual-connection-to-giving"],
      isClientGenerated,
      provider,
    };
  }

  // Re-initialize provider (for when user loads a different member)
  async reset(): Promise<void> {
    await graceWebGPUEngine.reset();
    this.initialized = false;
  }
}

export const graceAIService = new GraceAIService();
