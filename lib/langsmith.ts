import { Client } from "langsmith";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

let langsmithClient: Client | null = null;

export function getLangsmithClient(): Client {
  if (!langsmithClient) {
    // Support both LANGSMITH_* and LANGCHAIN_* prefixes for compatibility
    const apiKey = process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY;
    const apiUrl = process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com";
    
    langsmithClient = new Client({
      apiKey,
      apiUrl,
      // Respect optional privacy flags if set
      hideInputs: process.env.LANGSMITH_HIDE_INPUTS === "true",
      hideOutputs: process.env.LANGSMITH_HIDE_OUTPUTS === "true",
    });
  }
  return langsmithClient;
}

export function getLangChainTracer(projectName?: string): LangChainTracer {
  const client = getLangsmithClient();
  // Support both LANGSMITH_PROJECT and LANGCHAIN_PROJECT
  const defaultProject = process.env.LANGSMITH_PROJECT || process.env.LANGCHAIN_PROJECT || "default";
  const finalProject = projectName || defaultProject;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[LangSmith] Creating tracer for project: ${finalProject}`);
  }
  
  return new LangChainTracer({ 
    client, 
    projectName: finalProject 
  });
}

export async function flushLangsmith(): Promise<void> {
  try {
    await getLangsmithClient().awaitPendingTraceBatches();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("LangSmith flush failed:", error);
    }
  }
}

// Check if LangSmith tracing is enabled
// Supports multiple environment variable formats for compatibility
export const langsmithEnabled: boolean = (() => {
  const tracingEnabled = 
    process.env.LANGSMITH_TRACING === "true" ||
    process.env.NEXT_PUBLIC_LANGSMITH_TRACING === "true" ||
    process.env.LANGCHAIN_TRACING_V2 === "true";
  
  const hasApiKey = Boolean(process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY);
  
  const enabled = tracingEnabled && hasApiKey;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[LangSmith] Tracing enabled: ${enabled} (tracing flag: ${tracingEnabled}, has API key: ${hasApiKey})`);
  }
  
  return enabled;
})();


