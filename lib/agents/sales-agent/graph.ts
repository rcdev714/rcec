import { StateGraph, START, END } from "@langchain/langgraph";
import { SalesAgentState } from "./state";
import {
  loadUserContext,
  planTodos,
  think,
  callTools,
  processToolResults,
  finalize,
  shouldCallTools,
} from "./nodes";
import { SupabaseCheckpointSaver } from "./checkpointer";

/**
 * Build the Sales Agent StateGraph
 * This creates a sophisticated workflow with:
 * - User context loading
 * - Todo planning
 * - Iterative thinking and action
 * - Tool execution with success checking
 * - Reflection and retry logic
 * - State persistence via Supabase
 */
export function buildSalesAgentGraph() {
  // Create the graph
  // Note: Using 'as any' for graph to work around TypeScript limitations with LangGraph's Annotation API
  // The graph will still be type-safe at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph(SalesAgentState) as any;

  // Add nodes
  graph.addNode("load_user_context", loadUserContext);
  graph.addNode("plan_todos", planTodos);
  graph.addNode("think", think);
  // Use our wrapper function that properly extracts messages for ToolNode
  graph.addNode("tools", callTools);
  // Process tool results from ToolMessage and populate toolOutputs
  graph.addNode("process_tool_results", processToolResults);
  graph.addNode("finalize", finalize);

  // Define edges
  // START → load_user_context → plan_todos → think
  graph.addEdge(START, "load_user_context");
  graph.addEdge("load_user_context", "plan_todos");
  graph.addEdge("plan_todos", "think");

  // think → conditional: tools (if tool calls) or finalize (if done)
  // The ToolNode should only be invoked when the LLM returns tool calls
  graph.addConditionalEdges(
    "think",
    shouldCallTools,
    {
      tools: "tools",
      finalize: "finalize",
    }
  );

  // tools → process_tool_results → think (React pattern: let AI see results and decide next action)
  // We need to process the ToolMessage and populate toolOutputs before going back to think
  graph.addEdge("tools", "process_tool_results");
  graph.addEdge("process_tool_results", "think");

  // finalize → END
  graph.addEdge("finalize", END);

  // Compile graph (checkpointing is optional - enabled when passed to invoke)
  const compiledGraph = graph.compile({});

  return compiledGraph;
}

/**
 * Build the Sales Agent StateGraph with checkpointing enabled
 * Use this for async Trigger.dev execution where state persistence is critical
 */
export function buildSalesAgentGraphWithCheckpointer() {
  const graph = new StateGraph(SalesAgentState) as any;

  // Add nodes
  graph.addNode("load_user_context", loadUserContext);
  graph.addNode("plan_todos", planTodos);
  graph.addNode("think", think);
  graph.addNode("tools", callTools);
  graph.addNode("process_tool_results", processToolResults);
  graph.addNode("finalize", finalize);

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
    }
  );

  graph.addEdge("tools", "process_tool_results");
  graph.addEdge("process_tool_results", "think");
  graph.addEdge("finalize", END);

  // Compile WITH checkpointer for async mode
  const checkpointer = new SupabaseCheckpointSaver();
  
  const compiledGraph = graph.compile({
    checkpointer,
  });

  return compiledGraph;
}

// Export a singleton instance (with cache invalidation in development)
let graphInstance: ReturnType<typeof buildSalesAgentGraph> | null = null;

export function getSalesAgentGraph() {
  // In development, rebuild the graph each time to pick up changes
  if (process.env.NODE_ENV === 'development') {
    graphInstance = null;
  }
  
  if (!graphInstance) {
    graphInstance = buildSalesAgentGraph();
  }
  return graphInstance;
}

