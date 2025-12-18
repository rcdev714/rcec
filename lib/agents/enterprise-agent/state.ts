import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { UserOffering } from "@/types/user-offering";
import { AgentSettings } from "@/lib/types/agent-settings";

// Todo item structure for task management
export interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

// User context from Supabase
export interface UserContext {
  userId: string;
  offerings: UserOffering[];
  userProfile?: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    position?: string;
    email?: string;
    phone?: string;
  };
  subscription: {
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    status: string;
  };
  usage: {
    searches: number;
    exports: number;
    prompts: number;
  };
  limits: {
    searches: number;
    exports: number;
    prompts: number;
  };
}

// Tool output types
export interface ToolOutput {
  toolName: string;
  toolCallId?: string;
  input: Record<string, unknown>;
  output: unknown;
  success: boolean;
  timestamp: Date;
  errorMessage?: string;
}

// Selected company for context
export interface SelectedCompany {
  ruc: string;
  nombre: string;
  nombreComercial?: string;
  provincia?: string;
  ingresos?: number;
  empleados?: number;
  contactInfo?: ContactInfo;
}

// Contact information
export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  source?: string;
  confidence?: number;
}

// Email draft structure
export interface EmailDraft {
  subject: string;
  body: string;
  toEmail?: string;
  toName?: string;
  companyContext?: string;
  offeringContext?: string;
}

// Agent state event types for real-time UI updates
export type AgentStateEvent =
  | { type: 'thinking'; node: string; message?: string }
  | { type: 'tool_call'; toolName: string; toolCallId: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; toolCallId: string; success: boolean; output?: unknown; error?: string }
  | { type: 'error'; node: string; error: string }
  | { type: 'todo_update'; todos: TodoItem[] }
  | { type: 'reflection'; message: string; retryCount: number }
  | { type: 'iteration'; count: number; max: number }
  | { type: 'finalize'; message?: string };

// Agent goal types
export type AgentGoal = 
  | 'lead_generation'
  | 'company_research'
  | 'contact_enrichment'
  | 'email_drafting'
  | 'general_query';

// Define the agent state using LangGraph Annotation
// Primary export: EnterpriseAgentState (new name for clarity)
// Also exported as SalesAgentState for backwards compatibility
export const EnterpriseAgentState = Annotation.Root({
  // Core conversation
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  
  // Task management
  todo: Annotation<TodoItem[]>({
    reducer: (current, update) => {
      // Merge todos by ID, update existing or add new
      const todoMap = new Map(current.map(t => [t.id, t]));
      update.forEach(t => todoMap.set(t.id, t));
      return Array.from(todoMap.values());
    },
    default: () => [],
  }),
  
  // Iteration tracking
  iterationCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  
  // Tool tracking
  lastTool: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  lastToolSuccess: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => true,
  }),
  
  toolOutputs: Annotation<ToolOutput[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  
  // Context
  selectedCompany: Annotation<SelectedCompany | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  contactInfo: Annotation<ContactInfo | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  userContext: Annotation<UserContext | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  // Error tracking
  errorInfo: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  retryCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  
  // Goal and progress
  goal: Annotation<AgentGoal>({
    reducer: (_, update) => update,
    default: () => 'general_query',
  }),
  
  startTime: Annotation<Date>({
    reducer: (current, update) => current || update,
    default: () => new Date(),
  }),
  
  lastUpdateTime: Annotation<Date>({
    reducer: (_, update) => update,
    default: () => new Date(),
  }),
  
  // Email draft
  emailDraft: Annotation<EmailDraft | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  // Selected offering for current conversation context
  selectedOffering: Annotation<UserOffering | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  // Model selection
  modelName: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "gemini-2.5-flash",
  }),
  
  // Thinking level for Gemini 3 models (high = deep reasoning, low = faster/cheaper)
  thinkingLevel: Annotation<'high' | 'low'>({
    reducer: (_, update) => update,
    default: () => 'high',
  }),
  
  // Token tracking
  totalInputTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
  
  totalOutputTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
  
  totalTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),

  // Correction attempts to avoid infinite narration loops
  correctionCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Trigger.dev run ID for background task coordination
  runId: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Agent settings (model, temperature, tools)
  agentSettings: Annotation<AgentSettings | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

// Type for the state
export type EnterpriseAgentStateType = typeof EnterpriseAgentState.State;

// Backwards compatibility aliases
export const SalesAgentState = EnterpriseAgentState;
export type SalesAgentStateType = EnterpriseAgentStateType;

// Constants
export const MAX_ITERATIONS = 50; // Increased for complex multi-tool workflows (time-based circuit breaker is primary backstop)
export const MAX_RETRIES = 3;
// Increased so the agent can be nudged multiple times to keep executing pending TODOs
// without showing confusing "attempt x/3" messages or finalizing prematurely.
export const MAX_CORRECTIONS = 12;

