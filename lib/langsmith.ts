import { Client } from "langsmith";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

let langsmithClient: Client | null = null;

export function getLangsmithClient(): Client {
  if (!langsmithClient) {
    langsmithClient = new Client({
      apiKey: process.env.LANGSMITH_API_KEY,
      apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
      // Respect optional privacy flags if set
      hideInputs: process.env.LANGSMITH_HIDE_INPUTS === "true",
      hideOutputs: process.env.LANGSMITH_HIDE_OUTPUTS === "true",
    });
  }
  return langsmithClient;
}

export function getLangChainTracer(projectName?: string): LangChainTracer {
  const client = getLangsmithClient();
  return new LangChainTracer({ client, projectName: projectName || process.env.LANGSMITH_PROJECT });
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

export const langsmithEnabled: boolean =
  process.env.LANGSMITH_TRACING === "true" ||
  process.env.NEXT_PUBLIC_LANGSMITH_TRACING === "true" ||
  process.env.LANGCHAIN_TRACING_V2 === "true" ||
  Boolean(process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY) ||
  false;


