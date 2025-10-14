# Tavily Web Search & Extract Integration

## Overview

This project integrates the Tavily API to provide powerful web search and content extraction capabilities for the Sales Intelligence Agent. Tavily offers two main APIs:

1. **Tavily Search API** - Real-time web search with LLM-generated answers
2. **Tavily Extract API** - Deep content extraction from specific URLs with automatic contact information parsing

## Setup Instructions

### 1. Get Your Tavily API Key

1. Sign up at [Tavily.com](https://tavily.com)
2. Navigate to your dashboard after logging in
3. Copy your API key (format: `tvly-YOUR_API_KEY`)

### 2. Add API Key to Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# Tavily API Configuration
TAVILY_API_KEY=tvly-YOUR_API_KEY_HERE
```

**Important**: Never commit your `.env.local` file to version control. It should already be in `.gitignore`.

### 3. Verify Installation

The Tavily SDK is already installed via:
```bash
npm install @tavily/core
```

If you need to reinstall:
```bash
cd /Users/seb/Documents/RC/main/rcec-main
npm install @tavily/core
```

## Available Tools

### Tool 1: `web_search`

**Purpose**: Find information on the web using Tavily's search engine.

**When to Use**:
- Finding contact pages or corporate websites
- Searching for recent news about companies
- Finding LinkedIn profiles of executives
- Discovering social media profiles
- Validating company information

**Parameters**:
```typescript
{
  query: string;              // Natural language search query (REQUIRED)
  site?: string;              // Optional domain filter (e.g., "linkedin.com")
  maxResults?: number;        // Max results (default: 5, max: 20)
  searchDepth?: "basic" | "advanced";  // default: "basic" (1 credit), "advanced" (2 credits)
  includeAnswer?: boolean;    // Include LLM summary (default: true)
}
```

**Returns**:
```typescript
{
  success: boolean;
  answer?: string;            // LLM-generated summary
  results: Array<{
    title: string;
    url: string;
    content: string;          // Snippet/excerpt
    score: number;            // Relevance score
  }>;
  query: string;              // Actual query executed
  resultsCount: number;
  responseTime: string;
}
```

**Examples**:
```typescript
// Find contact page
await web_search({
  query: "contacto Corporación Favorita Ecuador sitio web"
});

// Find LinkedIn profile
await web_search({
  query: "CEO OTECEL Ecuador",
  site: "linkedin.com"
});

// Find recent news
await web_search({
  query: "noticias empresas tecnología Quito 2024",
  searchDepth: "advanced"
});
```

---

### Tool 2: `web_extract`

**Purpose**: Extract structured contact information from specific web pages.

**When to Use**:
- After finding a contact page URL with `web_search`
- Extracting emails, phone numbers, addresses from company pages
- Parsing "Contact Us", "About Us", or team pages
- Finding social media links and executive information

**Parameters**:
```typescript
{
  urls: string | string[];         // Single URL or array (max 5)
  extractDepth?: "basic" | "advanced";  // default: "basic"
  extractContactInfo?: boolean;    // Auto-parse contacts (default: true)
}
```

**Returns**:
```typescript
{
  success: boolean;
  results: Array<{
    url: string;
    rawContent: string;           // Full page content in markdown
    contentLength: number;
    contactInfo?: {               // Auto-parsed if extractContactInfo=true
      emails: Array<{
        address: string;
        type: "general" | "sales" | "support" | "other";
        confidence: "high" | "medium" | "low";
        source: string;
      }>;
      phones: Array<{
        number: string;           // International format (+593...)
        type: "landline" | "mobile" | "fax";
        label: string;
        confidence: "high" | "medium" | "low";
      }>;
      addresses: Array<{
        full_address: string;
        street?: string;
        city?: string;
        province?: string;
        country?: string;
        postal_code?: string | null;
        type: "headquarters" | "branch" | "other";
      }>;
      socialMedia: {
        linkedin?: string;
        facebook?: string;
        twitter?: string;
        instagram?: string;
        youtube?: string;
      };
      contacts: Array<{
        name: string;
        title: string;
        department?: string;
        email?: string;
        phone?: string;
        linkedin?: string;
      }>;
      metadata: {
        extractedAt: string;      // ISO timestamp
        sourceUrl: string;
        confidenceScore: number;  // 0-100
        notes: string[];          // Warnings and suggestions
      };
    };
  }>;
  failedUrls: Array<{
    url: string;
    error: string;
  }>;
  responseTime: number;
}
```

**Examples**:
```typescript
// Extract from single contact page
await web_extract({
  urls: "https://empresa.com/contacto"
});

// Extract from multiple pages
await web_extract({
  urls: [
    "https://empresa.com/contacto",
    "https://empresa.com/about"
  ],
  extractDepth: "advanced"  // For JavaScript-heavy pages
});
```

---

## Recommended Workflow: Finding Contact Information

### Step 1: Search for Contact Page
```typescript
const searchResult = await web_search({
  query: "contacto [Company Name] Ecuador sitio web"
});

// Get the URL from results
const contactUrl = searchResult.results[0]?.url;
```

### Step 2: Extract Contact Information
```typescript
const extractResult = await web_extract({
  urls: contactUrl
});

const contactInfo = extractResult.results[0]?.contactInfo;
```

### Step 3: Validate and Present
```typescript
// Check confidence scores
contactInfo.emails.forEach(email => {
  if (email.confidence === "high") {
    console.log(`✅ ${email.address} (${email.type}) - High confidence`);
  } else if (email.confidence === "low") {
    console.log(`⚠️ ${email.address} - Low confidence, verify before use`);
  }
});

// Check metadata warnings
if (contactInfo.metadata.confidenceScore < 50) {
  console.warn("⚠️ Low confidence extraction. Manual verification recommended.");
}

contactInfo.metadata.notes.forEach(note => {
  console.log(`📝 ${note}`);
});
```

---

## XML Prompt Engineering Guide

The `web_extract` tool uses a comprehensive XML-based prompt system to intelligently extract and validate contact information. This guide is embedded in the tool and includes:

### Extraction Patterns

1. **Email Patterns**
   - Regex validation
   - Priority indicators (info@, ventas@, sales@)
   - Corporate vs personal email detection
   - Confidence scoring

2. **Phone Patterns**
   - Ecuador format support (+593 X XXX-XXXX)
   - International format support
   - Landline vs mobile detection
   - Label extraction (Sales, Support, etc.)

3. **Address Patterns**
   - Street, city, province extraction
   - Ecuador-specific address parsing
   - Office vs residential validation

4. **Social Media Patterns**
   - LinkedIn (high priority for B2B)
   - Facebook, Twitter, Instagram, YouTube
   - Corporate vs personal profile detection
   - URL validation

5. **Contact Person Patterns**
   - Name and title extraction
   - Department identification
   - Executive prioritization (C-level > Directors > Managers)

### Quality Guidelines

- **Accuracy**: Never invent information; mark missing fields as `null`
- **Completeness**: Extract all available fields with proper context
- **Confidence Levels**:
  - **HIGH**: Official contact page, valid format, corporate domain
  - **MEDIUM**: Secondary page, partial format, generic context
  - **LOW**: Inferred data, personal domain, unclear context
- **Privacy & Ethics**: Only extract PUBLIC, CORPORATE information

### Error Handling

The system provides intelligent suggestions when:
- No contact info found → Suggests alternative pages to check
- Partial info found → Includes what's available with appropriate confidence
- Invalid format → Reports data with validation warning

---

## API Credits & Cost Management

### Search API
- **Basic Search**: 1 credit per request
- **Advanced Search**: 2 credits per request (deeper, more relevant results)

### Extract API
- **Basic Extract**: 1 credit per 5 successful URL extractions
- **Advanced Extract**: 2 credits per 5 successful URL extractions

### Recommendations
- Use `searchDepth: "basic"` for most queries
- Use `extractDepth: "basic"` for simple HTML pages
- Use `advanced` options only when needed (JavaScript-heavy sites, complex queries)
- Limit `maxResults` to what you actually need (default: 5 is usually sufficient)

---

## Best Practices

### 1. Be Specific in Queries
❌ Bad: `"company contact"`
✅ Good: `"contacto Corporación Favorita Ecuador sitio web"`

### 2. Use Site Restrictions When Appropriate
```typescript
// Finding LinkedIn profiles
web_search({ 
  query: "CEO María García Tech Solutions Ecuador",
  site: "linkedin.com"
});
```

### 3. Chain Search → Extract for Contact Discovery
```typescript
// RECOMMENDED PATTERN
async function findContacts(companyName: string) {
  // Step 1: Find contact page
  const search = await web_search({
    query: `contacto ${companyName} Ecuador sitio web`
  });
  
  // Step 2: Extract from contact page
  const contactUrls = search.results
    .filter(r => r.url.includes('/contact') || r.url.includes('/contacto'))
    .map(r => r.url)
    .slice(0, 2);  // Max 2 most relevant
    
  if (contactUrls.length === 0) return null;
  
  const extraction = await web_extract({ urls: contactUrls });
  
  return extraction.results[0]?.contactInfo;
}
```

### 4. Always Validate Confidence Scores
```typescript
// Check before using contacts
if (email.confidence === "low" || email.address.includes("@gmail.")) {
  console.warn("⚠️ Validate this email before sending: " + email.address);
}
```

### 5. Respect Rate Limits
- Don't make excessive concurrent requests
- Implement exponential backoff on errors
- Cache results when appropriate

---

## Integration with Sales Agent

The Sales Agent has been configured with both tools and uses them intelligently:

### Tool Priority for Contact Discovery

1. **Database First**: Check if company already has contacts in DB
2. **Web Extract** (Recommended): Use `web_search` → `web_extract` chain
3. **Enrich Contacts** (Fallback): Use `enrich_company_contacts` if above methods fail

### Agent Usage Patterns

The agent understands when to use each tool based on user intent:

- **"Find contact for [Company]"** → web_search → web_extract
- **"Latest news about [Company]"** → web_search with recent time filter
- **"LinkedIn profile of [Executive]"** → web_search with site:linkedin.com
- **"Email draft for [Company]"** → Full workflow with contact discovery

### Automatic Validation

The agent will:
- ✅ Report confidence scores in responses
- ⚠️ Warn when emails are from personal providers (gmail, hotmail)
- 📝 Include validation suggestions in email drafts
- 🔗 Provide alternative contact methods (LinkedIn InMail, phone, web form)

---

## Troubleshooting

### "Web search is not configured" Error
**Cause**: TAVILY_API_KEY not set in environment
**Solution**: Add `TAVILY_API_KEY=tvly-YOUR_KEY` to `.env.local`

### "No valid URLs provided" Error
**Cause**: Invalid URL format passed to web_extract
**Solution**: Ensure URLs include protocol (https://) and are properly formatted

### Low Confidence Scores
**Cause**: Limited contact info on page or ambiguous data
**Solution**: 
- Try extracting from multiple pages (`/contacto`, `/about`, `/team`)
- Use `extractDepth: "advanced"` for JavaScript-heavy sites
- Manually verify low-confidence data before use

### API Rate Limits
**Cause**: Too many requests in short time
**Solution**: 
- Implement request queuing
- Add delays between requests
- Cache frequent queries

### Empty Contact Info
**Cause**: Page doesn't have contact information or uses forms only
**Solution**:
- Check `metadata.notes` for suggestions
- Try alternative pages (about, team, footer)
- Look for social media links as alternative contact methods

---

## Testing

### Quick Test (Search)
```typescript
import { webSearchTool } from '@/lib/tools/web-search';

const result = await webSearchTool.func({
  query: "OpenAI GPT-4 launch",
  maxResults: 3
});

console.log(result.answer);  // LLM summary
console.log(result.results); // Search results
```

### Quick Test (Extract)
```typescript
import { webExtractTool } from '@/lib/tools/web-search';

const result = await webExtractTool.func({
  urls: "https://www.example.com/contact"
});

console.log(result.results[0]?.contactInfo);
```

---

## Support & Resources

- **Tavily Documentation**: https://docs.tavily.com
- **API Reference**: 
  - Search: https://docs.tavily.com/api-reference/search
  - Extract: https://docs.tavily.com/api-reference/extract
- **Support**: Contact Tavily support through their dashboard

---

## Future Enhancements

Potential improvements to consider:

1. **Caching Layer**: Cache search/extract results to reduce API calls
2. **Batch Processing**: Process multiple companies in parallel with rate limiting
3. **Enhanced Validation**: Integrate with email validation services (Hunter.io, ZeroBounce)
4. **Address Parsing**: More sophisticated Ecuador address parsing with geocoding
5. **Executive Enrichment**: Deeper LinkedIn profile analysis
6. **Confidence Scoring**: ML-based confidence scoring for contact accuracy

---

**Last Updated**: October 2025
**Version**: 1.0.0

