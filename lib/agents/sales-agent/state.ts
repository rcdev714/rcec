import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { UserOffering } from "@/types/user-offering";

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
  | { type: 'tool_call'; toolName: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; success: boolean; output?: unknown; error?: string }
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
export const SalesAgentState = Annotation.Root({
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
});

// Type for the state
export type SalesAgentStateType = typeof SalesAgentState.State;

// Constants
export const MAX_ITERATIONS = 15;
export const MAX_RETRIES = 3;

