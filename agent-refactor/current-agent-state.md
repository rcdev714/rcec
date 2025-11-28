This is a comprehensive codebase for a production-grade agent. You have built a robust logic layer with impressive features like context optimization, recovery mechanisms, and caching.

However, **your infrastructure is fighting your logic.**

You have written extensive code to manually manage timeouts (`TIME_CRITICAL_THRESHOLD_MS`, `elapsedMs`, manual circuit breakers), effectively building a "survival mode" because you are trying to run a long-running process (RAG/Agent) inside a short-lived HTTP request (Next.js/Netlify).

Here is the assessment and the refactoring plan to fix the root cause.

---

### 1. Architectural Assessment

| Component | Status | Analysis |
| :--- | :--- | :--- |
| **State Management** | 🟢 **Excellent** | Your `SalesAgentState` annotation is well-structured. The distinct tracking of `toolOutputs` vs `messages` is smart. |
| **Resilience** | 🟡 **Good (but defensive)** | `AgentRecoveryManager` is a great fallback, but it exists solely because the environment is unstable (timeouts). You shouldn't need a "heartbeat" monitor in a proper async worker. |
| **Tool Execution** | 🔴 **Critical Bottleneck** | In `nodes.ts`, `callTools` strictly limits parallel tools to 3 and has a hard timeout. This cripples the "Overpowered Search" idea. You are artificially throttling the agent to save time. |
| **Reasoning (`think`)** | 🟠 **Overloaded** | The `think` node handles too much: context stuffing, Gemini 3 vs 2.5 logic, and tool binding. It makes the graph hard to read. |
| **Streaming** | 🟠 **Fragile** | You are using a direct HTTP `ReadableStream`. If the browser disconnects or the tab closes, the agent dies immediately. |

---

### 2. The Refactoring Plan: "Async by Default"

We will move the execution from **Next.js API Routes** to **Trigger.dev** (or a background worker), and use **Supabase Realtime** to stream updates back to the UI.

#### The New Flow:
1.  **Frontend:** User sends message -> Writes to Supabase `messages` table.
2.  **Trigger:** Supabase Webhook (or direct API call) starts a Trigger.dev job.
3.  **Background Worker:** Runs the LangGraph agent.
    *   *No 60s timeout.*
    *   *Parallel execution of 10+ tools.*
4.  **Streaming:** The Agent saves chunks/events to Supabase.
5.  **Frontend:** Subscribes to Supabase Realtime to render the chat.

---

### 3. Step-by-Step Refactoring Guide

#### Step 1: Clean up `nodes.ts` (Remove the "Survival Code")
You can delete about 30% of your code. You no longer need to check `elapsedMs` or switch models based on remaining time.

**Refactor `callTools` to be truly parallel:**

```typescript
// src/lib/agent/nodes.ts

// REMOVE: All logic related to elapsedMs, TIME_CRITICAL_THRESHOLD_MS
// REMOVE: The artificial limit of 3 tools. Let it fly.

export async function callTools(state: SalesAgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = (lastMessage as any).tool_calls;

  // 1. Parallelize without limits
  // In a background job, we can run 10 searches at once.
  const toolPromises = toolCalls.map(async (call) => {
    const tool = toolMap.get(call.name);
    try {
      // Execute directly. If it takes 2 minutes, Trigger.dev handles it.
      const result = await tool.invoke(call.args);
      
      return new ToolMessage({
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(result)
      });
    } catch (e) {
      // Handle error
    }
  });

  const results = await Promise.all(toolPromises);
  
  return { messages: results };
}
```

#### Step 2: Implement the "Overpowered Search"
Modify your graph to use the "Scatter-Gather" pattern we discussed. Instead of letting the LLM iteratively call search 5 times, force a parallel search step.

**New Node in `nodes.ts`:**

```typescript
export async function marketscanNode(state: SalesAgentStateType) {
  const query = state.messages[state.messages.length - 1].content;
  
  // Launch "Shockwave"
  const [tavily, google, database, perplexity] = await Promise.all([
     tavilyTool.invoke(query),
     googleTool.invoke(query),
     // ... etc
  ]);

  // Aggregate and stuff into context
  return { 
    toolOutputs: [/* structured results */],
    // This node doesn't return messages, it just updates state context
    // so the NEXT 'think' node has all the data.
  };
}
```

#### Step 3: Move Graph Execution to Trigger.dev
Create a task that wraps your `graph.ts`.

**File: `src/trigger/sales-agent.ts`**

```typescript
import { task } from "@trigger.dev/sdk/v3";
import { getSalesAgentGraph } from "@/lib/agent/graph";
import { SupabaseCheckpointSaver } from "@/lib/agent/checkpointer"; // Enable this now!

export const salesAgentTask = task({
  id: "sales-agent-run",
  run: async (payload: { threadId: string; userMessage: string }) => {
    
    // 1. Setup Graph with Checkpoint persistence
    const checkpointer = new SupabaseCheckpointSaver();
    const graph = getSalesAgentGraph(); 
    
    // 2. Run the graph
    // We don't need to stream bytes here. We persist state to DB.
    await graph.invoke(
      { messages: [new HumanMessage(payload.userMessage)] },
      { 
        configurable: { thread_id: payload.threadId },
        checkpointer: checkpointer 
      }
    );

    return { status: "complete" };
  },
});
```

#### Step 4: Refactor Frontend to use Supabase Realtime
Instead of reading a `fetch` stream, your frontend listens to database changes. This makes the UI persistent and crash-proof.

**File: `components/chat-interface.tsx`**

```typescript
import { createClient } from '@/lib/supabase/client';

export function ChatInterface({ threadId }) {
  const [messages, setMessages] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial Load
    loadHistory();

    // 2. Listen for NEW messages added by the Trigger.dev worker
    const channel = supabase
      .channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_checkpoint_writes', // Or your own 'messages' table
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          // New token/message arrived from the background agent
          addMessageToUI(payload.new);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [threadId]);

  const sendMessage = async (text) => {
    // 1. Write user message to DB
    await saveUserMessage(text);
    
    // 2. Trigger the background job
    await fetch('/api/trigger-agent', { 
      method: 'POST', 
      body: JSON.stringify({ threadId, message: text }) 
    });
  };
}
```

### 4. Handling the Gemini 3 vs 2.5 Complexity

In `nodes.ts` (`think` function), you have complex logic patching Gemini 3's inability to handle tools + thinking mode.

**Refactoring Suggestion:**
Don't mix them in one node. Use **Model Routing**.

1.  **Router Node:** A cheap model (Gemini Flash) decides: "Does this query need tools (Search) or pure reasoning (Drafting/Planning)?"
2.  **Conditional Edge:**
    *   If `Needs Tools` -> Route to `Agent (Gemini 2.5 Pro)` (Better at tools).
    *   If `Deep Thought` -> Route to `Thinker (Gemini 3)` (Better at reasoning, no tools bound).

```typescript
// graph.ts logic update
graph.addConditionalEdges("router", (state) => {
   if (state.goal === "deep_reasoning") return "thinker_node"; // Gemini 3
   return "worker_node"; // Gemini 2.5 Pro with Tools
});
```

This removes the messy `if (isGemini3Thinking) disableTools()` logic from your code.

### Summary of Changes

1.  **Delete** `recovery.ts` and `timeout` logic. You don't need to recover from timeouts if you don't have timeouts.
2.  **Enable** `checkpointer.ts`. The agent state must live in Supabase, not in the memory of a fleeting HTTP request.
3.  **Deploy** the graph logic to **Trigger.dev**.
4.  **Frontend** becomes a "View" into the Supabase database, updating in real-time.

This architecture will allow your agent to run for 5-10 minutes if needed, performing deep market research without the user seeing a "Network Error".