import { hasModelInCache, CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

const MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC";

export type WebGPUEngineState = {
  isReady: boolean;
  modelLoaded: boolean;
  downloading: boolean;
  downloadProgress: number | null;
  errorMessage: string | null;
  isAvailable: boolean | null;
};

type ProgressCallback = (progress: number, message?: string) => void;

class GraceWebGPUEngine {
  private worker: Worker | null = null;
  private engine: Awaited<ReturnType<typeof CreateWebWorkerMLCEngine>> | null = null;
  private isInitializing = false;
  private state: WebGPUEngineState = {
    isReady: false,
    modelLoaded: false,
    downloading: false,
    downloadProgress: null,
    errorMessage: null,
    isAvailable: null,
  };

  setState(partial: Partial<WebGPUEngineState>) {
    this.state = { ...this.state, ...partial };
  }

  async init(onProgress?: ProgressCallback): Promise<boolean> {
    // Already initialized
    if (this.engine) return true;
    if (this.isInitializing) return false;

    const available = await GraceWebGPUEngine.checkAvailability();
    this.setState({ isAvailable: available });

    if (!available) {
      this.setState({ errorMessage: "WebGPU not supported on this browser" });
      return false;
    }

    this.isInitializing = true;

    try {
      // Create web worker for inference
      this.worker = new Worker(new URL("./grace-worker.worker.ts", import.meta.url), {
        type: "module",
      });

      const progressCB = (progress: number | string, _data?: Record<string, unknown>) => {
        let pct: number;
        let msg = "";
        
        if (typeof progress === "number") {
          pct = Math.max(0.1, Math.min(0.9, progress));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const strProgress = progress;
          if (strProgress.includes("load weight")) {
            const match = strProgress.match(/\d+\/\d+/);
            if (match) {
              const [current, total] = match[0].split("/").map(Number);
              pct = 0.1 + (0.8 * current / total);
            }
          } else if (strProgress.includes("done")) {
            pct = 1.0;
          } else {
            pct = 0.5;
          }
          msg = strProgress;
        }

        onProgress?.(pct, msg);
      };

      this.engine = await CreateWebWorkerMLCEngine(
        this.worker,
        MODEL_ID,
        undefined,
        progressCB as any,
      );

      this.setState({ 
        isReady: true, 
        modelLoaded: true, 
        downloading: false, 
        downloadProgress: 1.0,
        errorMessage: null,
      });

      onProgress?.(1.0, "Model loaded!");
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load model";
      this.setState({ 
        isReady: false, 
        modelLoaded: false, 
        downloading: false,
        errorMessage: message,
      });
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  async generate(
    prompt: string,
    onChunk?: (chunk: string) => void,
    maxTokens = 512,
  ): Promise<string> {
    if (!this.engine) {
      const loaded = await this.init();
      if (!loaded) throw new Error("WebGPU engine not available");
    }

    const completion = await this.engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.95,
      stream: true,
    });

    let fullResponse = "";
    
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        onChunk?.(content);
      }
    }

    return fullResponse || "(empty response)";
  }

  async reset() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.engine = null;
    this.setState({
      isReady: false,
      modelLoaded: false,
      downloadProgress: null,
      errorMessage: null,
    });
  }

  getState(): WebGPUEngineState {
    return { ...this.state };
  }

  static async checkAvailability(): Promise<boolean> {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as unknown as { gpu?: unknown };
    if (!nav.gpu) return false;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = await (nav.gpu as any).requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) return false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const device = await (adapter as any).requestDevice();
      if (!device) return false;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (device as any).destroy();
      return true;
    } catch {
      return false;
    }
  }

  static async isModelCached(): Promise<boolean> {
    return hasModelInCache(MODEL_ID);
  }
}

export const graceWebGPUEngine = new GraceWebGPUEngine();
// Module-level exports for convenience:
export const checkAvailability = GraceWebGPUEngine.checkAvailability;
