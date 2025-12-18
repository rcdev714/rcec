import { StateGraph, START, END } from "@langchain/langgraph";
import { EnterpriseAgentState } from "./state";
import {
  loadUserContext,
  planTodos,
  think,
  callTools,
  processToolResults,
  advanceTodo,
  finalize,
  shouldCallTools,
  correction,
} from "./nodes";
import { SupabaseCheckpointSaver } from "./checkpointer";

/**
 * Build the Enterprise Agent StateGraph
 * This creates a sophisticated workflow with:
 * - User context loading
 * - Todo planning
 * - Iterative thinking and action
 * - Tool execution with success checking
 * - Reflection and retry logic
 * - State persistence via Supabase
 */
export function buildEnterpriseAgentGraph() {
  // Create the graph
  // Note: Using 'as any' for graph to work around TypeScript limitations with LangGraph's Annotation API
  // The graph will still be type-safe at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph(EnterpriseAgentState) as any;

  // Add nodes
  graph.addNode("load_user_context", loadUserContext);
  graph.addNode("plan_todos", planTodos);
  graph.addNode("think", think);
  // Use our wrapper function that properly extracts messages for ToolNode
  graph.addNode("tools", callTools);
  // Process tool results from ToolMessage and populate toolOutputs
  graph.addNode("process_tool_results", processToolResults);
  // Advance the current todo for synthesis-only steps (no tool needed)
  graph.addNode("advance_todo", advanceTodo);
  graph.addNode("finalize", finalize);
  // Correction node for narration without action
  graph.addNode("correction", correction);

  // Define edges
  // START → load_user_context → plan_todos → think
  graph.addEdge(START, "load_user_context");
  graph.addEdge("load_user_context", "plan_todos");
  graph.addEdge("plan_todos", "think");

  // think → tools (if tool calls) or finalize (if done) or correction (if narration)
  // SIMPLIFIED: No narration detection, just check for tool calls
  graph.addConditionalEdges(
    "think",
    shouldCallTools,
    {
      tools: "tools",
      finalize: "finalize",
      correction: "correction",
      advance_todo: "advance_todo",
    }
  );

  // tools → process_tool_results → think (React pattern: let AI see results and decide next action)
  // We need to process the ToolMessage and populate toolOutputs before going back to think
  graph.addEdge("tools", "process_tool_results");
  graph.addEdge("process_tool_results", "think");
  graph.addEdge("advance_todo", "think");
  
  // correction → think (feedback loop)
  graph.addEdge("correction", "think");

  // finalize → END
  graph.addEdge("finalize", END);

  // Compile graph (checkpointing is optional - enabled when passed to invoke)
  const compiledGraph = graph.compile({});

  return compiledGraph;
}

/**
 * Build the Enterprise Agent StateGraph with checkpointing enabled
 * Use this for async Trigger.dev execution where state persistence is critical
 */
export function buildEnterpriseAgentGraphWithCheckpointer() {
  const graph = new StateGraph(EnterpriseAgentState) as any;

  // Add nodes
  graph.addNode("load_user_context", loadUserContext);
  graph.addNode("plan_todos", planTodos);
  graph.addNode("think", think);
  graph.addNode("tools", callTools);
  graph.addNode("process_tool_results", processToolResults);
  graph.addNode("advance_todo", advanceTodo);
  graph.addNode("finalize", finalize);
  graph.addNode("correction", correction);

  // Define edges
  graph.addEdge(START, "load_user_context");
  graph.addEdge("load_user_context", "plan_todos");
  graph.addEdge("plan_todos", "think");

  graph.addConditionalEdges(
    "think",
    shouldCallTools,
    {
      tools: "tools",
      finalize: "finalize",
      correction: "correction",
      advance_todo: "advance_todo",
    }
  );

  graph.addEdge("tools", "process_tool_results");
  graph.addEdge("process_tool_results", "think");
  graph.addEdge("advance_todo", "think");
  graph.addEdge("correction", "think");
  graph.addEdge("finalize", END);

  // Compile WITH checkpointer for async mode
  const checkpointer = new SupabaseCheckpointSaver();
  
  const compiledGraph = graph.compile({
    checkpointer,
  });

  return compiledGraph;
}

// Export a singleton instance (with cache invalidation in development)
let graphInstance: ReturnType<typeof buildEnterpriseAgentGraph> | null = null;

export function getEnterpriseAgentGraph() {
  // In development, rebuild the graph each time to pick up changes
  if (process.env.NODE_ENV === 'development') {
    graphInstance = null;
  }
  
  if (!graphInstance) {
    graphInstance = buildEnterpriseAgentGraph();
  }
  return graphInstance;
}

// Backwards compatibility aliases
export const buildSalesAgentGraph = buildEnterpriseAgentGraph;
export const buildSalesAgentGraphWithCheckpointer = buildEnterpriseAgentGraphWithCheckpointer;
export const getSalesAgentGraph = getEnterpriseAgentGraph;
