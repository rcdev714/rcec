# Sales Agent - Advanced LangGraph StateGraph Implementation

## Overview

This is a sophisticated sales agent built with LangGraph StateGraph v2, featuring:

- **Stateful workflow** with Supabase-backed checkpointing
- **Iterative planning and execution** with todo management
- **Success-checked tool use** with reflection and retry logic
- **Multi-tool integration** (company search, web search, contact enrichment, email drafting)
- **User context awareness** (offerings, subscription, usage limits)
- **Spanish-language interface** with professional sales expertise

## Architecture

### State Management (`state.ts`)

The agent maintains a rich state object with:
- `messages`: Conversation history
- `todo`: Task list with status tracking
- `iterationCount`: Loop control
- `lastTool`/`lastToolSuccess`: Tool execution tracking
- `toolOutputs`: Complete tool execution history
- `userContext`: User offerings, profile, subscription, usage (auto-loaded with detailed offering summaries)
- `selectedCompany`/`contactInfo`: Current lead context
- `selectedOffering`: Currently focused offering for conversation
- `emailDraft`: Generated email drafts
- `goal`: Current workflow intent (lead_generation, email_drafting, etc.)

### Workflow Nodes (`nodes.ts`)

1. **load_user_context**: Fetch user offerings, profile, subscription, and usage from Supabase
2. **plan_todos**: Generate task list based on user query
3. **think**: LLM reasoning with context and history trimming
4. **tools**: Execute selected tool (via ToolNode)
5. **evaluate_result**: Check tool execution success
6. **reflection**: Analyze failures and adjust parameters
7. **update_todos**: Mark tasks complete/failed
8. **iteration_control**: Increment counter and check completion
9. **finalize**: Prepare final response

### Graph Flow (`graph.ts`)

```
START → load_user_context → plan_todos → think → tools → evaluate_result
                                            ↑                    ↓
                                            |            (conditional)
                                            |         success / failure
                                            |              ↓      ↓
                                            |        update  reflection
                                            |         todos      ↓
                                            |           ↓        |
                                            |    iteration_control
                                            |           ↓
                                            |    (conditional)
                                            |    continue / finalize
                                            |       ↓         ↓
                                            └───────┘        END
```

### Checkpointing (`checkpointer.ts`)

- Persists state to `agent_checkpoints` and `agent_checkpoint_writes` tables
- Enables conversation continuity across sessions
- Supports thread-based isolation (per conversation)
- Implements LangGraph's `BaseCheckpointSaver` interface

## Tools

### Company Research Tools
- `search_companies`: Natural language company search with semantic filters
- `get_company_details`: Detailed financial and contact information
- `refine_search`: Advanced filter refinement
- `export_companies`: Excel export for CRM integration

### Web Research Tools

#### `web_search` (`web-search.ts`)
- Provider: Tavily API
- Use cases: Find contacts, company news, LinkedIn profiles
- Respects privacy and rate limits

#### `web_extract` (`web-search.ts`)
- Extracts structured data from web pages
- Finds contact info: emails, phones, social media
- Confidence scoring for data quality

### Contact Discovery Tools

#### `enrich_company_contacts` (`contact-tools.ts`)
- Searches directors database for decision-makers
- Provides safe, ethical contact suggestions
- Never invents information
- Suggests web search for additional verification

### User Offerings Tools

#### `list_user_offerings` (`offerings-tools.ts`)
- Lists all services/products in user's portfolio
- Returns: name, industry, target sectors, payment type
- Use cases:
  - "¿Qué servicios tengo registrados?"
  - Understanding user's portfolio before company search
  - Identifying which offering to pitch
- **Auto-loaded in context** - tool call only needed for detailed queries

#### `get_offering_details` (`offerings-tools.ts`)
- Retrieves complete information about a specific offering
- Returns: full description, pricing plans, website, docs, target industries
- Use cases:
  - Personalizing sales emails with accurate service details
  - Getting pricing information for proposals
  - Understanding target sectors for company matching
  - "Cuéntame sobre mi servicio de consultoría en IA"
- **Critical for email drafting** - ensures accurate, personalized pitches

### Communication Tools

#### `generate_sales_email` (`email-tools.ts`)
- Uses Gemini to generate personalized emails
- Inputs: company context + user offering details
- Outputs: subject + body (JSON)
- **Never sends automatically** - only drafts for user review

## System Prompt (`prompt.ts`)

Comprehensive Spanish-language prompt covering:
- Role and capabilities
- Tool descriptions with examples
- Workflow recommendations
- Privacy and ethics guidelines
- Response formatting
- Error handling
- User context usage

## API Integration (`index.ts`)

- `chatWithEnterpriseAgent()`: Main entry point
- Streams graph execution
- Parses tool outputs
- Injects `[SEARCH_RESULTS]` and `[EMAIL_DRAFT]` tags for UI

## UI Components

### Email Draft Card (`components/email-draft-card.tsx`)
- Displays generated email drafts
- Copy subject/body/all functionality
- Warning for missing recipient email
- Professional styling

### Chat UI Updates (`components/chat-ui.tsx`)
- Parses `[EMAIL_DRAFT]` tags
- Renders EmailDraftCard component
- Persists drafts to conversation history

## Configuration

### Environment Variables

Required:
- `GOOGLE_API_KEY`: Gemini API key
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

Optional:
- `TAVILY_API_KEY`: For web search (recommended)
- `GEMINI_MODEL`: Model name (default: "gemini-2.0-flash-exp")
- `LANGSMITH_PROJECT`: LangSmith project name
- `LANGSMITH_API_KEY`: LangSmith API key (for tracing)

### Database Tables

Created by `scripts-sql/agent-checkpoints.sql`:
- `agent_checkpoints`: Main state storage
- `agent_checkpoint_writes`: Pending channel updates

Both tables have RLS policies to ensure users only access their own data.

## Usage

### Basic Chat

```typescript
import { chatWithEnterpriseAgent } from '@/lib/agents/enterprise-agent';

const stream = await chatWithEnterpriseAgent(
  "Busca empresas tecnológicas en Quito con más de 100 empleados",
  [], // conversation history
  {
    userId: user.id,
    conversationId: conversationId,
  }
);

// Stream is a ReadableStream that can be returned from API route
return new Response(stream);
```

### API Route

The agent is integrated into `/app/api/chat/route.ts`:

```typescript
// Note: useSalesAgent param kept for backwards compatibility
const { message, conversationId, useSalesAgent = true } = await req.json();

if (useSalesAgent) {
  stream = await chatWithEnterpriseAgent(message, conversationHistory, {
    userId: user.id,
    conversationId: effectiveConversationId,
  });
}
```

### Example Workflows

#### Lead Generation
```
User: "Busca empresas rentables en Guayaquil con más de 50 empleados"
Agent:
1. plan_todos: ["search_companies"]
2. think: Determine search criteria
3. tools: Execute search_companies
4. evaluate_result: Check results
5. update_todos: Mark complete
6. finalize: Present results with [SEARCH_RESULTS] tag
```

#### Email Drafting
```
User: "Redacta un email para Corporación Favorita ofreciendo mi sistema de inventarios"
Agent:
1. plan_todos: ["search_company", "get_details", "find_contact", "draft_email"]
2. think: Need company info
3. tools: search_companies("Corporación Favorita")
4. evaluate_result: Success
5. update_todos: Mark search complete
6. think: Need details
7. tools: get_company_details(ruc)
8. evaluate_result: Success
9. update_todos: Mark details complete
10. think: Need contact
11. tools: enrich_company_contacts(...)
12. evaluate_result: Success
13. update_todos: Mark contact complete
14. think: Ready to draft
15. tools: generate_sales_email(company, contact, offering)
16. evaluate_result: Success
17. update_todos: Mark draft complete
18. finalize: Present draft with [EMAIL_DRAFT] tag
```

#### Offering-based Company Matching
```
User: "¿Qué servicios tengo? Busca empresas en Pichincha para mi servicio de IA"
Agent:
1. plan_todos: ["list_offerings", "search_companies"]
2. think: User wants to see offerings first
3. tools: list_user_offerings(userId)
4. evaluate_result: Success (finds 3 offerings including "Consultoría IA" targeting Finance, Healthcare)
5. think: Now search companies matching AI offering targets in Pichincha
6. tools: search_companies("empresas Pichincha sector financiero salud tecnología")
7. evaluate_result: Success
8. finalize: Present companies with explanation of offering-company fit
```

#### Detailed Offering Context for Email
```
User: "Cuéntame sobre mi servicio de consultoría y redacta email para Banco Pichincha"
Agent:
1. plan_todos: ["get_offering", "search_company", "get_details", "draft_email"]
2. think: User wants offering details first
3. tools: get_offering_details(offering_id)
4. evaluate_result: Success (gets full description, $5000/month pricing, target sectors)
5. think: Now get company info
6. tools: search_companies("Banco Pichincha")
7. evaluate_result: Success
8. tools: get_company_details(ruc)
9. evaluate_result: Success
10. think: Ready to draft with full offering context
11. finalize: Present offering summary + personalized email mentioning specific features and pricing
```

## Iteration and Reflection

- **Max iterations**: 15 (configurable in `state.ts`)
- **Max retries per tool**: 3 (configurable in `state.ts`)
- **Reflection**: On tool failure, agent analyzes error and adjusts parameters
- **Graceful degradation**: After max retries, agent informs user and continues

## Testing

Run tests with:
```bash
npm test lib/agents/enterprise-agent
```

Test coverage:
- Node execution
- Conditional routing
- Tool success/failure handling
- State persistence
- End-to-end workflows

## Future Enhancements

- [ ] Add more tools (CRM integration, calendar scheduling)
- [ ] Implement multi-agent collaboration
- [ ] Add voice/audio support
- [ ] Enhance reflection with learned patterns
- [ ] Add A/B testing for email templates
- [ ] Implement feedback loop for email effectiveness
- [ ] Add support for other languages
- [ ] Integrate with email sending services (with approval)

## Troubleshooting

### Agent not responding
- Check `GOOGLE_API_KEY` is set
- Verify Supabase connection
- Check console for errors

### Tools failing
- Verify tool-specific API keys (TAVILY_API_KEY)
- Check Supabase table permissions
- Review tool output in logs

### Checkpoints not persisting
- Verify `agent_checkpoints` tables exist
- Check RLS policies
- Ensure `thread_id` is provided

### Email drafts not generating
- Check Gemini API quota
- Verify user offerings exist
- Review prompt in logs

## Contributing

When adding new tools:
1. Create tool in `lib/tools/`
2. Add to `allTools` array in `graph.ts`
3. Document in `prompt.ts`
4. Add examples to this README
5. Write tests

When modifying state:
1. Update `state.ts` schema
2. Update relevant nodes
3. Update checkpointer if needed
4. Test persistence

## License

Same as parent project.

