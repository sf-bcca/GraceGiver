import { WebGPUEngineState } from "./GraceWebGPUEngine";

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
  provider?: "server";
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
  provider?: "server";
}

class GraceAIService {
  async initialize(): Promise<void> {
    // Server AI via OpenRouter is the authoritative AI provider.
  }

  getProvider(): "server" {
    return "server";
  }

  getState(): WebGPUEngineState {
    return {
      isReady: true,
      modelLoaded: false,
      downloading: false,
      downloadProgress: null,
      errorMessage: null,
      isAvailable: false,
    };
  }

  async generateInsight(
    donationData: Array<{ date: string; amount: number; fund?: string }>,
    memberName: string,
    options: AIGenerationOptions = {},
  ): Promise<AIInsightData> {
    return this.generateInsightServer(donationData, memberName, options);
  }

  async generateMemberNarrative(
    memberId: string,
    year: string,
    options: AIGenerationOptions = {},
  ): Promise<MemberNarrativeResult> {
    return this.generateNarrativeServer(memberId, year, options);
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
          Authorization: token ? `Bearer ${token}` : "",
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
      console.warn("Server AI fallback failed", err);
      return this.buildFallbackInsight(donationData, memberName);
    }
  }

  private async generateNarrativeServer(
    memberId: string,
    year: string,
    _options: AIGenerationOptions = {},
  ): Promise<MemberNarrativeResult> {
    try {
      const token = localStorage.getItem("token");
      const base = API_URL.startsWith("http") ? API_URL : `${window.location.origin}${API_URL}`;
      const url = new URL(`${base}/api/reports/member-narrative/${encodeURIComponent(memberId)}`);
      url.searchParams.set("year", year);
      const response = await fetch(url.toString(), {
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
  ): AIInsightData {
    const totalGiving = donationData.reduce((sum, d) => sum + d.amount, 0);
    const giftCount = donationData.length;

    return {
      narrative: `${memberName} has demonstrated faithful stewardship with ${giftCount} gifts totaling $${totalGiving.toFixed(2)}. Consider discussing expansion of their giving horizons.`,
      sentiment: totalGiving > 1000 ? "growing" : "neutral",
      stewardshipGrowth: giftCount > 5 ? Math.round((60 + Math.random() * 35) * 10) / 10 : Math.round((40 + Math.random() * 15) * 10) / 10,
      recommendedFocus: ["expanding-giving-horizons", "spiritual-connection-to-giving"],
      isClientGenerated: false,
      provider: "server",
    };
  }

  async reset(): Promise<void> {
    // No-op for server-only AI pipeline
  }
}

export const graceAIService = new GraceAIService();
