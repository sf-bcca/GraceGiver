import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-worker global onmessage event type
self.onmessage = (event: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-llm internal handler types
  handler.onmessage(event, undefined as never, undefined as never);
};

self.onerror = (err: ErrorEvent) => {
  self.postMessage({ type: "error", error: err.message });
};
