# Sales Agent Quick Start Guide

## Setup (5 minutes)

### 1. Environment Variables

Add to your `.env.local`:

```env
# Required
GOOGLE_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional but recommended
TAVILY_API_KEY=your_tavily_api_key  # For web search
```

### 2. Database Migration

The migration has already been applied, but if you need to reapply:

```bash
# Via Supabase CLI
supabase db push

# Or via SQL editor in Supabase Dashboard
# Copy contents of scripts-sql/agent-checkpoints.sql
```

### 3. Test the Agent

```bash
npm run dev
```

Navigate to `http://localhost:3000/chat`

## Usage Examples

### Example 1: Find Leads

**Query:**
```
Busca empresas tecnológicas en Quito con más de 100 empleados y ingresos superiores a $1M
```

**What happens:**
1. Agent plans: ["search_companies"]
2. Executes search with filters
3. Returns company cards with financial data
4. Offers to export results

**Expected response time:** 3-5 seconds

---

### Example 2: Research a Company

**Query:**
```
Dame información detallada sobre Corporación Favorita
```

**What happens:**
1. Agent plans: ["search_company", "get_details"]
2. Finds company by name
3. Fetches detailed financial history
4. Presents comprehensive report

**Expected response time:** 5-8 seconds

---

### Example 3: Find Contacts

**Query:**
```
Encuentra el contacto del gerente general de Banco Pichincha
```

**What happens:**
1. Agent plans: ["search_company", "find_contact"]
2. Searches company
3. Looks in directors database
4. If not found, suggests web search
5. Returns contact info with confidence score

**Expected response time:** 4-6 seconds

---

### Example 4: Draft Sales Email (Full Workflow)

**Query:**
```
Redacta un email para el gerente de Corporación Favorita ofreciendo mi sistema de gestión de inventarios
```

**Prerequisites:**
- You must have a user offering created in Supabase
- Navigate to `/offerings` to create one first

**What happens:**
1. Agent loads your offerings
2. Plans: ["search_company", "get_details", "find_contact", "draft_email"]
3. Finds Corporación Favorita
4. Gets detailed company info
5. Searches for contact
6. Generates personalized email using:
   - Company context (size, industry, location)
   - Your offering details
   - Professional tone
7. Returns email draft card with copy buttons

**Expected response time:** 15-25 seconds

---

### Example 5: Web Search for Recent News

**Query:**
```
Busca noticias recientes sobre Corporación Favorita en Ecuador
```

**Prerequisites:**
- `TAVILY_API_KEY` must be set

**What happens:**
1. Agent plans: ["web_search"]
2. Executes Tavily search
3. Returns summarized results with sources
4. Provides links for more info

**Expected response time:** 3-5 seconds

---

## Tips for Best Results

### 1. Be Specific
❌ "Busca empresas"
✅ "Busca empresas tecnológicas en Quito con más de 50 empleados"

### 2. Use Natural Language
✅ "Encuentra empresas rentables en Guayaquil"
✅ "Muéstrame las empresas con mayores ingresos en Pichincha"
✅ "Dame contactos de empresas manufactureras"

### 3. Multi-Step Queries
✅ "Busca empresas de retail en Quito y redacta un email ofreciendo mi servicio"

The agent will break this down into steps automatically.

### 4. Ask for Clarification
If the agent asks for clarification, provide it:

**Agent:** "¿Te refieres a empresas de tecnología o empresas que usan tecnología?"
**You:** "Empresas de tecnología (desarrollo de software)"

### 5. Use Context
The agent remembers conversation history:

**You:** "Busca empresas en Quito"
**Agent:** [Shows results]
**You:** "Ahora filtra por más de 100 empleados"
**Agent:** [Refines previous search]

---

## Common Workflows

### Lead Generation Workflow

```
1. "Busca empresas [criteria]"
   → Get list of potential leads

2. "Dame más detalles sobre [empresa]"
   → Research specific company

3. "Encuentra contactos de [empresa]"
   → Get decision-maker info

4. "Redacta un email para [empresa]"
   → Generate personalized pitch

5. Copy email and send manually
```

### Market Research Workflow

```
1. "Busca empresas en [sector] en [provincia]"
   → Get market overview

2. "Ordena por ingresos descendente"
   → Identify market leaders

3. "Exporta los resultados"
   → Download for analysis

4. "Busca noticias sobre [empresa líder]"
   → Get recent updates
```

### Competitive Analysis Workflow

```
1. "Busca empresas similares a [mi empresa]"
   → Find competitors

2. "Compara sus ingresos y empleados"
   → Benchmark metrics

3. "Encuentra sus contactos"
   → Identify key players

4. "Analiza sus fortalezas"
   → Strategic insights
```

---

## Troubleshooting

### Agent Not Responding

**Symptoms:** No response after 30 seconds

**Solutions:**
1. Check browser console for errors
2. Verify `GOOGLE_API_KEY` is set
3. Check Supabase connection
4. Try refreshing the page

### Tool Failures

**Symptoms:** "Lo siento, no pude completar la acción..."

**Solutions:**
1. Check if `TAVILY_API_KEY` is set (for web search)
2. Verify Supabase tables exist
3. Check API quotas (Gemini, Tavily)
4. Try simpler query

### No Email Draft Generated

**Symptoms:** Agent searches but doesn't draft email

**Solutions:**
1. Create a user offering first (`/offerings`)
2. Be explicit: "redacta un email" or "escribe un correo"
3. Provide company name clearly
4. Check Gemini API quota

### Slow Performance

**Symptoms:** Takes >30 seconds

**Solutions:**
1. Simplify query (break into steps)
2. Check network connection
3. Verify API response times
4. Clear conversation and start fresh

---

## Advanced Usage

### Custom Tone for Emails

```
"Redacta un email formal para [empresa]"
"Redacta un email amigable para [empresa]"
"Redacta un email profesional para [empresa]"
```

### Specific Contact Roles

```
"Encuentra el contacto del CEO de [empresa]"
"Busca el gerente de compras de [empresa]"
"Dame el contacto del director financiero"
```

### Filtered Searches

```
"Busca empresas en Pichincha con:
- Más de 200 empleados
- Ingresos superiores a $5M
- Rentables
- Del sector manufacturero"
```

### Export and Analyze

```
1. "Busca empresas [criteria]"
2. "Exporta los resultados"
3. Download Excel file
4. Analyze in spreadsheet
```

---

## Keyboard Shortcuts

- `Enter`: Send message
- `Shift + Enter`: New line (in message)
- `Ctrl/Cmd + K`: Clear conversation
- `Ctrl/Cmd + /`: Focus input

---

## Best Practices

### 1. Start with Offerings
Before drafting emails, create your offerings:
- Go to `/offerings`
- Add product/service details
- Include target industries
- Save

### 2. Verify Before Sending
Always review and edit email drafts:
- Check company name spelling
- Verify contact information
- Adjust tone if needed
- Add personal touches

### 3. Validate Contacts
Never trust contact info blindly:
- Cross-reference with LinkedIn
- Verify email format
- Check company website
- Use email validation tools

### 4. Respect Limits
Free plan limits:
- 10 searches/month
- 10 prompts/month
- 2 exports/month

Upgrade to PRO for more.

### 5. Provide Feedback
If results aren't what you expected:
- Ask for clarification
- Refine your query
- Use more specific criteria
- Break into smaller steps

---

## Support

### Documentation
- Full docs: `lib/agents/sales-agent/README.md`
- Implementation: `SALES_AGENT_IMPLEMENTATION.md`

### Common Issues
- Check console logs (F12)
- Review Supabase logs
- Check API quotas
- Verify environment variables

### Getting Help
1. Check documentation
2. Review error messages
3. Test with simple queries
4. Contact support if persistent

---

## Next Steps

1. ✅ Complete setup
2. ✅ Try example queries
3. ✅ Create user offerings
4. ✅ Generate your first lead list
5. ✅ Draft your first email
6. 🚀 Start closing deals!

---

**Happy Selling! 🎯**

