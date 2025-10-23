# Token Counting Implementation

## Overview

This document describes the full-stack token counting implementation for Gemini models using Google's native tokenizer API.

## Architecture

### Backend (Server-Side)

#### 1. Token Counter Utility (`lib/token-counter.ts`)

Provides accurate token counting using Google's official Generative AI SDK:

```typescript
import { countTokensForText, extractTokenUsageFromMetadata } from "@/lib/token-counter";

// Count tokens for a string
const tokens = await countTokensForText("Hello world", "gemini-2.5-flash");

// Extract from LangChain response
const usage = extractTokenUsageFromMetadata(response.response_metadata);
// Returns: { inputTokens: 100, outputTokens: 50, totalTokens: 150 }
```

**Key Functions:**
- `countTokensForText(text, modelName)` - Count tokens for a string using Google's API
- `countTokensForMessages(messages, modelName)` - Count tokens for conversation history
- `extractTokenUsageFromMetadata(metadata)` - Extract usage from LangChain AIMessage
- `estimateTokensFromText(text)` - Fast estimation (~4 chars/token)
- `formatTokenCount(tokens)` - Format for display ("1.5K", "2.3M")
- `calculateGeminiCost(model, inputTokens, outputTokens)` - Calculate USD cost

#### 2. Agent State Tracking (`lib/agents/sales-agent/state.ts`)

The Sales Agent state now includes token tracking:

```typescript
export const SalesAgentState = Annotation.Root({
  // ... other fields
  
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
});
```

#### 3. Token Capture in Nodes (`lib/agents/sales-agent/nodes.ts`)

The `think` and `finalize` nodes extract token usage from model responses:

```typescript
const response = await model.invoke(messagesToSend);

// Extract token usage from response metadata
const tokenUsage = extractTokenUsageFromMetadata(response.response_metadata);

if (tokenUsage) {
  return {
    messages: [response],
    totalInputTokens: tokenUsage.inputTokens,
    totalOutputTokens: tokenUsage.outputTokens,
    totalTokens: tokenUsage.totalTokens,
  };
}
```

#### 4. Stream Token Emission (`lib/agents/sales-agent/index.ts`)

Token counts are streamed to the frontend via `[TOKEN_USAGE]` tags:

```typescript
// Track token usage during streaming
if (nodeOutput.totalTokens) {
  totalTokens += nodeOutput.totalTokens;
}

// At stream end, emit token usage
const tokenUsageTag = `[TOKEN_USAGE]${JSON.stringify({
  inputTokens: totalInputTokens,
  outputTokens: totalOutputTokens,
  totalTokens: totalTokens,
})}[/TOKEN_USAGE]`;
```

#### 5. Token Tracking API (`app/api/chat/track-tokens/route.ts`)

Receives token counts from frontend and updates `user_usage` table:

```typescript
POST /api/chat/track-tokens
{
  "inputTokens": 150,
  "outputTokens": 200,
  "totalTokens": 350,
  "model": "gemini-2.5-flash"
}
```

Updates:
- `user_usage.prompt_input_tokens` - Total input tokens (analytics)
- `user_usage.prompt_output_tokens` - Total output tokens (analytics)
- `user_usage.prompt_dollars` - Calculated cost in USD

### Frontend (Client-Side)

#### 1. Stream Parsing (`components/chat-ui.tsx`)

The chat UI parses `[TOKEN_USAGE]` tags from the stream:

```typescript
// Process TOKEN_USAGE blocks
const tokenStartTag = '[TOKEN_USAGE]';
const tokenEndTag = '[/TOKEN_USAGE]';

// Extract and parse
tokenUsage = JSON.parse(jsonStr);
// { inputTokens: 150, outputTokens: 200, totalTokens: 350 }
```

#### 2. Database Storage

Token counts are stored in two places:

**Per-Message (`conversation_messages` table):**
```typescript
await conversationManager.addMessage(conversationId, {
  role: 'assistant',
  content: assistantResponseText,
  tokenCount: tokenUsage?.totalTokens || 0,  // Store per-message count
  createdAt: new Date(),
});
```

**User Analytics (`user_usage` table):**
```typescript
// Track token usage for analytics and billing
await fetch('/api/chat/track-tokens', {
  method: 'POST',
  body: JSON.stringify({
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    totalTokens: tokenUsage.totalTokens,
    model: selectedModel,
  }),
});
```

## Database Schema

### conversation_messages
```sql
CREATE TABLE conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  token_count integer DEFAULT 0,  -- Per-message token count
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
```

### user_usage
```sql
CREATE TABLE user_usage (
  user_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  searches integer DEFAULT 0,
  exports integer DEFAULT 0,
  prompt_input_tokens bigint DEFAULT 0,   -- Total input tokens (analytics)
  prompt_output_tokens bigint DEFAULT 0,  -- Total output tokens (analytics)
  prompt_dollars numeric DEFAULT 0,       -- Calculated cost
  prompts_count integer DEFAULT 0,        -- Request count (rate limiting)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);
```

## Token Flow Diagram

```
┌──────────────┐
│   User Input │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Backend: Chat API                   │
│ - Estimate input tokens (pre-call)  │ ─────► Track prompts_count
│ - Track in user_usage               │        (rate limiting)
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Sales Agent: Think/Finalize Nodes   │
│ - Invoke Gemini model               │
│ - Extract token usage from metadata │
│ - Store in agent state              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Sales Agent: Stream Response        │
│ - Accumulate token counts           │
│ - Emit [TOKEN_USAGE] tag            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Frontend: Parse Stream               │
│ - Extract token usage from tag      │
│ - Store in conversation_messages     │ ─────► token_count column
│ - Call track-tokens API              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Backend: Track Tokens API            │
│ - Update prompt_input_tokens         │ ─────► user_usage table
│ - Update prompt_output_tokens        │        (analytics)
│ - Calculate and track cost           │
└─────────────────────────────────────┘
```

## Pricing Configuration

Current pricing (as of 2024):

```typescript
const GEMINI_PRICING_PER_MILLION = {
  "gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash-exp": { input: 0.0, output: 0.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
};
```

## Why Server-Side Implementation?

1. **Accuracy**: Uses Google's native tokenizer matching Gemini's actual counting
2. **Security**: Token counts affect billing and can't be manipulated client-side
3. **No Bundle Size**: No need to ship tokenizer (~1MB) to frontend
4. **Model-Specific**: Different models have different tokenizers
5. **Automatic**: Extracted from model response metadata (no separate API call)

## Testing Token Counting

### 1. Verify Token Capture

```bash
# Enable development logging
export NODE_ENV=development

# Watch for token logs in agent
grep -i "token usage" logs
```

### 2. Check Database

```sql
-- Check per-message token counts
SELECT id, role, token_count, LEFT(content, 50) as content_preview
FROM conversation_messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY created_at DESC;

-- Check user usage analytics
SELECT 
  user_id,
  period_start,
  prompts_count,
  prompt_input_tokens,
  prompt_output_tokens,
  prompt_dollars
FROM user_usage
WHERE user_id = 'YOUR_USER_ID'
ORDER BY period_start DESC;
```

### 3. Frontend Console

```javascript
// Check token usage in browser console
// After a chat message completes, look for:
"Successfully parsed token usage: {inputTokens: X, outputTokens: Y, totalTokens: Z}"
```

## Monitoring & Analytics

### Usage Summary API

```typescript
GET /api/usage/summary

Response:
{
  "plan": "PRO",
  "usage": {
    "searches": 45,
    "exports": 3,
    "prompts": 67,
    "input_tokens": 15000,    // Analytics
    "output_tokens": 25000,   // Analytics
    "cost_dollars": 0.025     // Calculated cost
  },
  "limits": {
    "searches": 100,
    "exports": 20,
    "prompts": 100
  }
}
```

## Future Enhancements

1. **Real-time Cost Display**: Show running cost to user during chat
2. **Token Budget Warnings**: Alert when approaching limits
3. **Per-Conversation Analytics**: Track token usage per conversation
4. **Model Switching**: Suggest cheaper models when appropriate
5. **Caching**: Utilize Gemini's context caching to reduce costs

## Related Files

- `lib/token-counter.ts` - Core token counting utilities
- `lib/agents/sales-agent/state.ts` - Agent state with token tracking
- `lib/agents/sales-agent/nodes.ts` - Token extraction from model responses
- `lib/agents/sales-agent/index.ts` - Token streaming to frontend
- `app/api/chat/track-tokens/route.ts` - Token tracking API
- `components/chat-ui.tsx` - Frontend token parsing and storage
- `lib/usage.ts` - Usage tracking utilities
- `lib/usage-atomic.ts` - Atomic database operations

## Dependencies

```json
{
  "@google/generative-ai": "^0.21.0",  // Google's native SDK
  "@langchain/google-genai": "^0.2.16", // LangChain integration
  "@langchain/core": "0.3.70"          // LangChain base
}
```

## Environment Variables

```bash
GOOGLE_API_KEY=your_google_api_key_here
```

---

**Last Updated**: January 2025  
**Status**: ✅ Production Ready

