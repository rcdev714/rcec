import { CompanySearchResult } from "@/types/chat";
import type { AgentStateEvent as AgentStateEventFromIndicator } from "@/components/agent-state-indicator";

export interface EmailDraft {
  subject: string;
  body: string;
  toName?: string;
  toEmail?: string;
  companyName?: string;
}

export interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

// Keep AgentStateEvent exactly aligned with the UI renderer expectations
export type AgentStateEvent = AgentStateEventFromIndicator;

// Defensive render-time sanitization to prevent any bracketed tags or raw JSON
export function sanitizeForRender(text: string): string {
  if (!text) return "";
  let clean = text
    // Remove internal tags
    .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
    .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
    .replace(/\[SEARCH_RESULTS\][\s\S]*?\[\/SEARCH_RESULTS\]/g, '')
    .replace(/\[DISPLAY_CONFIG\][\s\S]*?\[\/DISPLAY_CONFIG\]/g, '')
    .replace(/\[EMAIL_DRAFT\][\s\S]*?\[\/EMAIL_DRAFT\]/g, '')
    .replace(/\[TOKEN_USAGE\][\s\S]*?\[\/TOKEN_USAGE\]/g, '')
    // Remove any remaining [object Object] artifacts
    .replace(/\[object Object\],?/g, '')
    // Remove Gemini 3 specific tags
    .replace(/<const>[\s\S]*?<\/const>/g, '')
    .replace(/<tool_code>[\s\S]*?<\/tool_code>/g, '')
    // Replace HTML break tags with newlines
    .replace(/<br\s*\/?>/gi, '\n');
  
  // Remove Gemini internal JSON (functionCall, thoughtSignature) - can be very long
  // Match JSON arrays containing these keys and remove them completely
  if (clean.includes('"functionCall"') || clean.includes('"thoughtSignature"')) {
    // Remove JSON that starts with [{ and contains these internal keys
    clean = clean.replace(/\[\s*\{[^[\]]*"(?:functionCall|thoughtSignature)"[^]*?\}\s*\]/g, '');
    // Also try to catch partial JSON fragments
    clean = clean.replace(/"thoughtSignature"\s*:\s*"[^"]*"/g, '');
    clean = clean.replace(/"functionCall"\s*:\s*\{[^}]*\}/g, '');
  }
  
  return clean.trim();
}

// Helper to sanitize legacy content and extract structured blocks
export const parseAndSanitizeMessage = (role: "user" | "assistant" | "system", content: string) => {
  let clean = content || "";

  // Remove any STATE_EVENT blocks entirely
  clean = clean.replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, "");

  // Extract SEARCH_RESULTS
  let extractedSearchResult: CompanySearchResult | undefined;
  clean = clean.replace(/\[SEARCH_RESULTS\]([\s\S]*?)\[\/SEARCH_RESULTS\]/g, (_m: string, p1: string) => {
    try {
      const parsed = JSON.parse(p1);
      extractedSearchResult = parsed;
    } catch {
      // Ignore parse errors
    }
    return "";
  });

  // Extract DISPLAY_CONFIG for company cards
  let extractedDisplayConfig: { featuredRUCs?: string[] } | undefined;
  clean = clean.replace(/\[DISPLAY_CONFIG\]([\s\S]*?)\[\/DISPLAY_CONFIG\]/g, (_m: string, p1: string) => {
    try {
      const parsed = JSON.parse(p1);
      extractedDisplayConfig = parsed;
    } catch {
      // Ignore parse errors
    }
    return "";
  });

  // Extract EMAIL_DRAFT
  let extractedEmailDraft: EmailDraft | undefined;
  clean = clean.replace(/\[EMAIL_DRAFT\]([\s\S]*?)\[\/EMAIL_DRAFT\]/g, (_m: string, p1: string) => {
    try {
      const parsed = JSON.parse(p1);
      extractedEmailDraft = parsed;
    } catch {
      // Ignore parse errors
    }
    return "";
  });

  // Extract AGENT_PLAN (todos)
  let extractedTodos: TodoItem[] | undefined;
  clean = clean.replace(/\[AGENT_PLAN\]([\s\S]*?)\[\/AGENT_PLAN\]/g, (_m: string, p1: string) => {
    try {
      const parsed = JSON.parse(p1);
      extractedTodos = parsed;
    } catch {
      // Ignore parse errors
    }
    return "";
  });

  // Remove any remaining [AGENT_PLAN] markers (in case they appear without closing tags or with extra content)
  clean = clean.replace(/\[AGENT_PLAN\][^\[]*$/g, "");
  clean = clean.replace(/\[\/AGENT_PLAN\]/g, "");

  // Strip common tool transcript lines that might have leaked into model text
  clean = clean
    .replace(/^Herramienta utilizada:[\s\S]*?(?=\n\n|$)/gmi, "")
    .replace(/^Parámetros:[\s\S]*?(?=\n\n|$)/gmi, "")
    .replace(/\[CALL:[^\]]*\][^\n]*\n?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Create metadata object
  // Note: Message type interface would need to be imported or defined if strict typing is needed here
  const metadata: any = {};
  if (extractedSearchResult) {
    metadata.type = 'company_results';
  }
  if (extractedEmailDraft) {
    metadata.type = 'email_draft';
  }

  return { clean, extractedSearchResult, extractedEmailDraft, extractedTodos, extractedDisplayConfig, metadata };
};

