Here is the comprehensive technical report summarizing our architecture session.

---

# Technical Report: AI Agent Architecture Refactor
**Subject:** Migrating from Synchronous Serverless Functions to Asynchronous Background Workers
**Date:** November 26, 2025
**Context:** Next.js Enterprise Sales Agent (LangGraph) hosted on Netlify

## 1. Executive Summary
The current AI agent implementation is failing in production due to platform constraints. While the logic works locally, the **Netlify Free Tier 10-second timeout** kills the process before the AI can complete deep research.

Furthermore, the current codebase attempts to mitigate this via "Survival Mode" coding (manual timeouts, limiting tool usage), which degrades the intelligence of the agent.

**The Decision:** We are pivoting from a **Synchronous HTTP** architecture to an **Asynchronous Background Worker** architecture using **Trigger.dev** and **Supabase Realtime**.

---

## 2. Problem Articulation

### A. The Core Constraint (The 10-Second Wall)
The current architecture attempts to run a Long-Running Process (LRP) inside a Short-Lived Request.
*   **Localhost:** Works because there is no timeout.
*   **Netlify/Vercel:** Hard timeout at 10-60 seconds.
*   **Result:** The AI agent gets "sigkilled" mid-thought.

### B. The Performance Cost (Web Vitals)
Because the frontend `await`s the API response, the UI blocks until the server replies.
*   **LCP (Largest Contentful Paint):** **5.70s** (Rated "Poor").
*   **UX:** User sees a blank screen or static loader for too long, leading to bounce.

### C. The "Survival Mode" Codebase
To prevent crashing, the current code (`nodes.ts`) contains complex defensive logic that actively handicaps the AI:
*   **Artificial Throttling:** `MAX_PARALLEL_TOOLS = 3` (Limits search breadth).
*   **Panic Logic:** `TIME_CRITICAL_THRESHOLD_MS` checks that force the AI to stop thinking and guess an answer if time runs out.
*   **Manual Timeouts:** `executeToolWithTimeout` wrappers that kill tools if they take >30s.

---

## 3. The Solution: "Async by Default"

We are decoupling the **Request** (User clicking send) from the **Execution** (The Agent thinking).

### Architecture Diagram

```mermaid
graph LR
    User[User UI] -->|1. POST Request| NextAPI[Next.js API]
    NextAPI -->|2. Trigger Job| TriggerDev[Trigger.dev Worker]
    NextAPI -- 3. Return Job ID (200 OK) --> User
    
    TriggerDev -->|4. Run Agent (No Timeout)| LangGraph[LangGraph Logic]
    LangGraph -- 5. Save State --> Supabase[Supabase DB]
    
    Supabase -- 6. Realtime Event --> User
```

### Key Benefits
1.  **Infinite Context:** The agent can run for 60 minutes if needed.
2.  **"Overpowered" Search:** We can implement the proposed "Hybrid Search" (Tavily + Google + Perplexity + DB) simultaneously without fear of timeouts.
3.  **Instant Feedback:** The UI loads immediately (Skeleton state), improving LCP to <1.5s.

---

## 4. Implementation Manual

### Phase 1: Infrastructure (The Worker)

We move the execution context from `app/api/...` to `src/trigger/...`.

**New File:** `src/trigger/sales-agent.ts`

```typescript
import { task } from "@trigger.dev/sdk/v3";
import { getSalesAgentGraph } from "@/lib/agent/graph";
import { SupabaseCheckpointSaver } from "@/lib/agent/checkpointer";

export const salesAgentTask = task({
  id: "sales-agent-run",
  // We can now run for up to 60 minutes
  machine: { preset: "medium-1x" }, 
  run: async (payload: { threadId: string; userMessage: string }) => {
    
    // 1. Initialize Persistence (Critical for async flows)
    const checkpointer = new SupabaseCheckpointSaver();
    const graph = getSalesAgentGraph(); 
    
    // 2. Execute Graph
    // The state changes are saved to Supabase automatically by the checkpointer
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

### Phase 2: Logic Refactor (Unleashing the Agent)

We remove the defensive code in `nodes.ts` to allow "Overpowered Search" (Parallel Execution).

**Refactored File:** `src/lib/agent/nodes.ts`

```typescript
// OLD: Had complex timeout logic and limits
// NEW: clean, aggressive parallel execution

export async function callTools(state: SalesAgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = (lastMessage as any).tool_calls;

  console.log(`🚀 Launching ${toolCalls.length} tools in parallel...`);

  // 1. Execute ALL requested tools simultaneously
  // No limits. No timeouts. If it takes 2 minutes, Trigger.dev handles it.
  const results = await Promise.all(
    toolCalls.map(async (call) => {
      const tool = toolMap.get(call.name);
      const output = await tool.invoke(call.args);
      
      return new ToolMessage({
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(output)
      });
    })
  );
  
  return { messages: results };
}
```

### Phase 3: Frontend (Realtime Listener)

The frontend no longer waits for a response. It listens to the database.

**Refactored Component:** `components/chat-interface.tsx`

```typescript
import { createClient } from '@/lib/supabase/client';

export function ChatInterface({ threadId }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    // Subscribe to the table where LangGraph saves state
    const channel = supabase
      .channel('agent-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_checkpoint_writes', // Standard LangGraph persistence table
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          // A new message was saved by the background worker!
          // Update UI immediately
          const newMessage = parseCheckpointPayload(payload.new);
          setMessages((prev) => [...prev, newMessage]);
          setIsThinking(false);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [threadId]);

  const handleSend = async (text) => {
    setIsThinking(true); // Show skeleton loader immediately
    
    // Fire and Forget
    await fetch('/api/agent/start', { 
      method: 'POST', 
      body: JSON.stringify({ message: text, threadId }) 
    });
  };
}
```

---

## 5. Conclusion

By moving to this architecture, we achieve:
1.  **Stability:** 0% chance of Netlify timeout errors.
2.  **Quality:** The Agent can now use "Ensemble Retrieval" (searching Google, Tavily, and Vector DB simultaneously) without hitting memory or time limits.
3.  **Experience:** The user gets an instant "Acknowledged" UI state, and sees the answer appear in real-time as the database updates.

**Next Steps:**
1.  Set up the Trigger.dev project.
2.  Run the refactor prompt provided in the previous turn.
3.  Deploy and monitor the `agent_checkpoints` table.