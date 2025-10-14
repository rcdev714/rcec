import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string | null;
  favicon?: string;
}

interface TavilySearchResponse {
  query: string;
  answer?: string;
  images: Array<{ url: string; description?: string }>;
  results: TavilySearchResult[];
  response_time: string;
  request_id: string;
}

interface TavilyExtractResult {
  url: string;
  raw_content: string;
  images?: string[];
  favicon?: string;
}

interface TavilyExtractResponse {
  results: TavilyExtractResult[];
  failed_results: Array<{ url: string; error: string }>;
  response_time: number;
  request_id: string;
}

// ============================================================================
// XML PROMPT TEMPLATES FOR CONTACT EXTRACTION
// ============================================================================

export const CONTACT_EXTRACTION_PROMPTS = `
<contact_extraction_guide>
  <purpose>
    Extraer información de contacto estructurada de páginas web de empresas.
    Los datos a extraer incluyen: emails, teléfonos, direcciones, redes sociales, y sitios web.
  </purpose>

  <extraction_patterns>
    <pattern type="email">
      <description>Direcciones de correo electrónico corporativas</description>
      <regex>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}</regex>
      <priority_indicators>
        <high>info@, contacto@, ventas@, sales@, contact@, hola@</high>
        <medium>Emails en sección "Contacto", "Contáctanos", "Contact Us"</medium>
        <low>Emails en footer o pie de página</low>
        <exclude>ejemplo@, test@, noreply@, no-reply@</exclude>
      </priority_indicators>
      <validation>
        <rule>Debe tener dominio válido (no .example, .test, .invalid)</rule>
        <rule>Preferir emails corporativos sobre personales (gmail, hotmail, etc.)</rule>
        <rule>Verificar que esté en contexto de contacto empresarial</rule>
      </validation>
    </pattern>

    <pattern type="phone">
      <description>Números telefónicos de contacto</description>
      <formats>
        <ecuador>
          <landline>+593 [2-7] XXX-XXXX</landline>
          <mobile>+593 9XX XXX XXX</mobile>
          <alternative>0[2-7] XXX XXXX, 09XX XXX XXX</alternative>
        </ecuador>
        <international>+[country_code] [number]</international>
      </formats>
      <indicators>
        <search_near>Teléfono, Tel, Phone, Llamar, Llámanos, Call us</search_near>
        <section>Contacto, Contact, Atención al Cliente, Customer Service</section>
      </indicators>
      <validation>
        <rule>Mínimo 7 dígitos (sin contar código de país)</rule>
        <rule>Excluir números de ejemplo: 555-XXXX, 123-4567</rule>
        <rule>Priorizar números con etiquetas (Ventas, Soporte, etc.)</rule>
      </validation>
    </pattern>

    <pattern type="address">
      <description>Direcciones físicas de oficinas</description>
      <components>
        <street>Calle, Avenida, Av., Diagonal, Carrera, etc.</street>
        <city>Ciudad principal (Quito, Guayaquil, Cuenca, etc.)</city>
        <province>Provincia ecuatoriana</province>
        <country>Ecuador</country>
        <postal_code>Código postal (si está disponible)</postal_code>
      </components>
      <indicators>
        <search_near>Dirección, Address, Ubicación, Location, Oficina, Office, Sede</search_near>
      </indicators>
      <validation>
        <rule>Debe incluir al menos calle y ciudad</rule>
        <rule>Excluir direcciones de ejemplo o placeholder</rule>
        <rule>Verificar que sea dirección de oficina/empresa, no residencial</rule>
      </validation>
    </pattern>

    <pattern type="social_media">
      <description>Perfiles en redes sociales corporativas</description>
      <platforms>
        <linkedin>
          <pattern>linkedin.com/company/[company-name]</pattern>
          <pattern>linkedin.com/in/[person-name]</pattern>
          <priority>Alta - mejor para contacto B2B</priority>
        </linkedin>
        <facebook>
          <pattern>facebook.com/[company-page]</pattern>
          <priority>Media - útil para empresas B2C</priority>
        </facebook>
        <twitter>
          <pattern>twitter.com/[handle]</pattern>
          <pattern>x.com/[handle]</pattern>
          <priority>Media - útil para noticias y updates</priority>
        </twitter>
        <instagram>
          <pattern>instagram.com/[handle]</pattern>
          <priority>Baja - principalmente B2C</priority>
        </instagram>
        <youtube>
          <pattern>youtube.com/@[channel]</pattern>
          <pattern>youtube.com/channel/[id]</pattern>
          <priority>Baja - contenido de marca</priority>
        </youtube>
      </platforms>
      <validation>
        <rule>URL debe estar completa y ser válida</rule>
        <rule>Verificar que sea perfil corporativo, no personal</rule>
        <rule>Preferir perfiles verificados cuando sea visible</rule>
      </validation>
    </pattern>

    <pattern type="website">
      <description>Sitio web corporativo oficial</description>
      <indicators>
        <primary>Dominio principal de la empresa</primary>
        <secondary>Subdominios: www, en, es, latam, ec</secondary>
      </indicators>
      <validation>
        <rule>Debe ser dominio propio de la empresa, no marketplace</rule>
        <rule>Preferir HTTPS sobre HTTP</rule>
        <rule>Excluir páginas de redes sociales</rule>
      </validation>
    </pattern>

    <pattern type="contact_person">
      <description>Personas de contacto identificadas</description>
      <extract>
        <name>Nombre completo de la persona</name>
        <title>Cargo o posición (CEO, Gerente, Director, etc.)</title>
        <department>Departamento (Ventas, Comercial, RRHH, etc.)</department>
        <email>Email directo si está disponible</email>
        <phone>Teléfono directo o extensión</phone>
      </extract>
      <indicators>
        <search_near>Equipo, Team, Directorio, Directory, Contacto, Contact</search_near>
        <titles>CEO, Director, Gerente, Manager, Jefe, Head, VP, Presidente</titles>
      </indicators>
      <validation>
        <rule>Nombre debe ser nombre real, no genérico ("Servicio al Cliente")</rule>
        <rule>Título debe ser relevante para B2B (decisor o influencer)</rule>
        <rule>Priorizar: C-level > Directors > Managers</rule>
      </validation>
    </pattern>
  </extraction_patterns>

  <extraction_strategy>
    <step number="1">
      <action>Identificar sección de contacto</action>
      <look_for>
        - Página /contacto, /contact, /contact-us
        - Sección "Contáctanos", "Contact", "Get in Touch"
        - Footer de la página
        - Página "About Us" o "Acerca de"
      </look_for>
    </step>

    <step number="2">
      <action>Extraer información estructurada</action>
      <method>
        - Buscar patrones específicos usando regex
        - Verificar contexto semántico alrededor
        - Validar formato de cada tipo de dato
        - Asignar nivel de confianza (alta, media, baja)
      </method>
    </step>

    <step number="3">
      <action>Priorizar y filtrar</action>
      <criteria>
        - Emails corporativos > emails genéricos > emails personales
        - Contactos directos > formularios de contacto
        - Información en páginas oficiales > información inferida
        - Datos recientes > datos potencialmente obsoletos
      </criteria>
    </step>

    <step number="4">
      <action>Estructurar resultado final</action>
      <format>
        {
          "company_name": "string",
          "website": "string",
          "emails": [
            {
              "address": "string",
              "type": "general|sales|support|other",
              "confidence": "high|medium|low",
              "source": "contact_page|footer|about|other"
            }
          ],
          "phones": [
            {
              "number": "string (formato internacional)",
              "type": "landline|mobile|fax",
              "label": "string (Ventas, Soporte, etc.)",
              "confidence": "high|medium|low"
            }
          ],
          "addresses": [
            {
              "full_address": "string",
              "street": "string",
              "city": "string",
              "province": "string",
              "country": "string",
              "postal_code": "string|null",
              "type": "headquarters|branch|other"
            }
          ],
          "social_media": {
            "linkedin": "string|null",
            "facebook": "string|null",
            "twitter": "string|null",
            "instagram": "string|null",
            "youtube": "string|null"
          },
          "contacts": [
            {
              "name": "string",
              "title": "string",
              "department": "string|null",
              "email": "string|null",
              "phone": "string|null",
              "linkedin": "string|null"
            }
          ],
          "extraction_metadata": {
            "extracted_at": "ISO timestamp",
            "source_urls": ["array of URLs"],
            "confidence_score": "number (0-100)",
            "notes": "string (warnings or observations)"
          }
        }
      </format>
    </step>
  </extraction_strategy>

  <quality_guidelines>
    <accuracy>
      <rule>NUNCA inventar información que no esté presente en el contenido</rule>
      <rule>Si un campo no se encuentra, marcarlo como null, no asumir valores</rule>
      <rule>Validar formato antes de incluir (especialmente emails y teléfonos)</rule>
    </accuracy>

    <completeness>
      <rule>Intentar extraer todos los campos posibles</rule>
      <rule>Si hay múltiples valores (ej: varios emails), incluir todos con prioridad</rule>
      <rule>Incluir contexto cuando sea relevante (ej: "email de ventas")</rule>
    </completeness>

    <confidence>
      <high>Dato encontrado en página oficial de contacto con formato válido</high>
      <medium>Dato encontrado en página secundaria o con formato parcial</medium>
      <low>Dato inferido o encontrado sin contexto claro</low>
      <report>Siempre incluir nivel de confianza para guiar al usuario</report>
    </confidence>

    <privacy_ethics>
      <rule>Extraer solo información PÚBLICA y CORPORATIVA</rule>
      <rule>NO extraer información personal de empleados sin rol público</rule>
      <rule>NO extraer datos de páginas protegidas o con acceso restringido</rule>
      <rule>Advertir al usuario validar información antes de usar para contacto</rule>
    </privacy_ethics>
  </quality_guidelines>

  <error_handling>
    <no_contact_info>
      <message>No se encontró información de contacto en esta página</message>
      <suggest>
        - Verificar si hay página de contacto específica
        - Buscar en subdirectorios: /contacto, /contact, /contact-us
        - Revisar footer o sección "About"
        - Intentar búsqueda web para encontrar contacto en otros sitios
      </suggest>
    </no_contact_info>

    <partial_info>
      <message>Se encontró información parcial de contacto</message>
      <action>Incluir lo encontrado con niveles de confianza apropiados</action>
      <suggest>Otras fuentes donde buscar información faltante</suggest>
    </partial_info>

    <invalid_format>
      <message>Se encontró potencial información pero con formato inválido</message>
      <action>Reportar el dato encontrado con advertencia de validación requerida</action>
    </invalid_format>
  </error_handling>

  <examples>
    <example type="complete_extraction">
      <input>
        Página de contacto de empresa tecnológica:
        "Contáctanos en info@techcorp.com.ec
        Teléfono: +593 2 234-5678
        Dirección: Av. República 123, Quito, Ecuador
        Síguenos en LinkedIn: linkedin.com/company/techcorp"
      </input>
      <output>
        {
          "company_name": "TechCorp",
          "website": "techcorp.com.ec",
          "emails": [
            {
              "address": "info@techcorp.com.ec",
              "type": "general",
              "confidence": "high",
              "source": "contact_page"
            }
          ],
          "phones": [
            {
              "number": "+593 2 234-5678",
              "type": "landline",
              "label": "General",
              "confidence": "high"
            }
          ],
          "addresses": [
            {
              "full_address": "Av. República 123, Quito, Ecuador",
              "street": "Av. República 123",
              "city": "Quito",
              "province": "Pichincha",
              "country": "Ecuador",
              "postal_code": null,
              "type": "headquarters"
            }
          ],
          "social_media": {
            "linkedin": "https://linkedin.com/company/techcorp",
            "facebook": null,
            "twitter": null,
            "instagram": null,
            "youtube": null
          },
          "contacts": [],
          "extraction_metadata": {
            "extracted_at": "2025-10-14T10:00:00Z",
            "source_urls": ["https://techcorp.com.ec/contacto"],
            "confidence_score": 95,
            "notes": "Información completa y verificable"
          }
        }
      </output>
    </example>

    <example type="partial_extraction">
      <input>
        Footer de sitio web sin página de contacto dedicada:
        "© 2025 MiEmpresa | Síguenos: facebook.com/miempresa"
      </input>
      <output>
        {
          "company_name": "MiEmpresa",
          "website": "miempresa.com",
          "emails": [],
          "phones": [],
          "addresses": [],
          "social_media": {
            "linkedin": null,
            "facebook": "https://facebook.com/miempresa",
            "twitter": null,
            "instagram": null,
            "youtube": null
          },
          "contacts": [],
          "extraction_metadata": {
            "extracted_at": "2025-10-14T10:00:00Z",
            "source_urls": ["https://miempresa.com"],
            "confidence_score": 30,
            "notes": "Información limitada. Recomendado: buscar página de contacto específica o usar formulario web."
          }
        }
      </output>
    </example>
  </examples>
</contact_extraction_guide>
`;

// ============================================================================
// TAVILY SEARCH TOOL
// ============================================================================

/**
 * Web search tool using Tavily Search API
 * Provides real-time web search capabilities for finding contact information,
 * company news, and validating information
 */
export const webSearchTool = tool(
  async ({ 
    query, 
    site, 
    maxResults = 5,
    searchDepth = 'basic',
    includeAnswer = true 
  }: { 
    query: string; 
    site?: string; 
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
  }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      
      if (!apiKey) {
        return {
          success: false,
          error: 'Web search is not configured. Please add TAVILY_API_KEY to environment variables.',
          results: [],
        };
      }

      // Build search query with site restriction if provided
      const searchQuery = site ? `site:${site} ${query}` : query;

      // Call Tavily Search API
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: searchQuery,
          max_results: Math.min(maxResults, 20),
          search_depth: searchDepth,
          include_answer: includeAnswer,
          include_raw_content: false,
          include_images: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavily API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data: TavilySearchResponse = await response.json();

      // Format results
      const results = (data.results || []).map((result: TavilySearchResult) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
      }));

      return {
        success: true,
        answer: data.answer || null,
        results,
        query: searchQuery,
        resultsCount: results.length,
        responseTime: data.response_time,
      };
    } catch (error) {
      console.error('Web search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during web search',
        results: [],
      };
    }
  },
  {
    name: 'web_search',
    description: `Buscar información actualizada en internet usando Tavily Search API. 

Esta herramienta es ideal para:
- 🔍 Encontrar información de contacto de empresas (emails, teléfonos, direcciones)
- 📰 Buscar noticias recientes sobre empresas
- ✅ Validar información de empresas
- 🌐 Encontrar sitios web corporativos oficiales
- 👔 Buscar perfiles de LinkedIn de ejecutivos y tomadores de decisión
- 📱 Encontrar perfiles en redes sociales corporativas

Estrategia de uso:
1. Usa queries específicas: "contacto email gerente general Empresa XYZ Ecuador"
2. Para LinkedIn: Usa site="linkedin.com" con nombre de persona o empresa
3. Para noticias: Incluye términos temporales "noticias últimos 6 meses"
4. Para contacto: Combina "contacto" + nombre empresa + ubicación

Limitaciones éticas:
- ❌ NO buscar información personal no pública
- ❌ NO hacer scraping agresivo de datos
- ✅ SIEMPRE validar confiabilidad de las fuentes
- ✅ SIEMPRE advertir al usuario sobre validación de contactos

Ejemplos efectivos:
- "contacto email ventas Corporación Favorita Ecuador"
- "site:linkedin.com CEO OTECEL Movistar Ecuador"
- "noticias empresas tecnología Quito 2024"
- "dirección oficinas Banco Pichincha Guayaquil"`,
    schema: z.object({
      query: z.string().describe('Consulta de búsqueda en lenguaje natural. Sé específico: incluye nombre de empresa, ubicación, y tipo de información buscada.'),
      site: z.string().optional().describe('Opcional: Limitar búsqueda a un dominio específico (ej: "linkedin.com", "empresa.com")'),
      maxResults: z.number().optional().default(5).describe('Número máximo de resultados (default: 5, max: 20)'),
      searchDepth: z.enum(['basic', 'advanced']).optional().default('basic').describe('Profundidad de búsqueda. "basic" (1 crédito) para búsquedas generales, "advanced" (2 créditos) para información detallada.'),
      includeAnswer: z.boolean().optional().default(true).describe('Incluir respuesta generada por LLM resumiendo los resultados'),
    }),
  }
);

// ============================================================================
// TAVILY EXTRACT TOOL (New!)
// ============================================================================

/**
 * Web content extraction tool using Tavily Extract API
 * Extracts and parses content from specific URLs to find contact information
 */
export const webExtractTool = tool(
  async ({ 
    urls, 
    extractDepth = 'basic',
    extractContactInfo = true 
  }: { 
    urls: string | string[]; 
    extractDepth?: 'basic' | 'advanced';
    extractContactInfo?: boolean;
  }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      
      if (!apiKey) {
        return {
          success: false,
          error: 'Web extract is not configured. Please add TAVILY_API_KEY to environment variables.',
          results: [],
        };
      }

      // Ensure urls is an array
      const urlArray = Array.isArray(urls) ? urls : [urls];

      // Validate URLs
      const validUrls = urlArray.filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      if (validUrls.length === 0) {
        return {
          success: false,
          error: 'No valid URLs provided',
          results: [],
        };
      }

      // Call Tavily Extract API
      const response = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          urls: validUrls,
          extract_depth: extractDepth,
          include_images: false,
          include_favicon: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavily Extract API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data: TavilyExtractResponse = await response.json();

      // Process results
      const extractedResults = data.results.map((result) => {
        const extracted: any = {
          url: result.url,
          rawContent: result.raw_content,
          contentLength: result.raw_content.length,
        };

        // If contact info extraction is requested, parse the content
        if (extractContactInfo && result.raw_content) {
          extracted.contactInfo = extractContactInformation(result.raw_content, result.url);
        }

        return extracted;
      });

      return {
        success: true,
        results: extractedResults,
        failedUrls: data.failed_results.map(f => ({ url: f.url, error: f.error })),
        responseTime: data.response_time,
        extractionGuide: extractContactInfo ? 'Used contact extraction patterns from XML prompt guide' : null,
      };
    } catch (error) {
      console.error('Web extract error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during web extraction',
        results: [],
      };
    }
  },
  {
    name: 'web_extract',
    description: `Extraer contenido estructurado de páginas web específicas usando Tavily Extract API.

Esta herramienta es IDEAL para:
- 📧 Extraer información de contacto detallada (emails, teléfonos, direcciones)
- 🏢 Parsear páginas de "Contacto" o "About Us" de empresas
- 👥 Encontrar información de ejecutivos y tomadores de decisión
- 🌐 Obtener perfiles en redes sociales
- 📍 Extraer direcciones físicas de oficinas

Flujo recomendado:
1. Primero usa web_search para encontrar la URL de la página de contacto
2. Luego usa web_extract con esas URLs para obtener información detallada
3. La herramienta automáticamente parsea y estructura la información

Guía de extracción XML:
${CONTACT_EXTRACTION_PROMPTS}

Limitaciones:
- Máximo 5 URLs por llamada (para mantener performance)
- Solo extrae información PÚBLICA visible en la página
- No puede acceder a contenido protegido por login
- Respeta robots.txt y términos de servicio

Ejemplos de uso:
- urls: ["https://empresa.com/contacto"]
- urls: ["https://empresa.com/contact-us", "https://empresa.com/about"]
- extractDepth: "advanced" para páginas complejas con JavaScript`,
    schema: z.object({
      urls: z.union([
        z.string().url().describe('URL única a extraer'),
        z.array(z.string().url()).max(5).describe('Array de URLs a extraer (máximo 5)')
      ]).describe('URL o URLs de páginas web a extraer. Preferiblemente páginas de contacto, about, o perfil de empresa.'),
      extractDepth: z.enum(['basic', 'advanced']).optional().default('basic').describe('Profundidad de extracción. "basic" (1 crédito/5 URLs) para páginas simples, "advanced" (2 créditos/5 URLs) para sitios complejos con tablas y contenido embebido.'),
      extractContactInfo: z.boolean().optional().default(true).describe('Automáticamente parsear y estructurar información de contacto usando patrones XML.'),
    }),
  }
);

// ============================================================================
// CONTACT INFORMATION EXTRACTION HELPER
// ============================================================================

/**
 * Extract structured contact information from raw web content
 * Uses patterns defined in CONTACT_EXTRACTION_PROMPTS
 */
function extractContactInformation(content: string, sourceUrl: string) {
  const contactInfo: any = {
    emails: [],
    phones: [],
    addresses: [],
    socialMedia: {},
    contacts: [],
    metadata: {
      extractedAt: new Date().toISOString(),
      sourceUrl,
      confidenceScore: 0,
      notes: [],
    },
  };

  // Email extraction
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  const emails = content.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails)];
  
  uniqueEmails.forEach(email => {
    // Skip example/test emails
    if (email.includes('ejemplo') || email.includes('test') || email.includes('noreply')) {
      return;
    }

    const lowerEmail = email.toLowerCase();
    let type = 'other';
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    // Determine email type and confidence
    if (lowerEmail.includes('info@') || lowerEmail.includes('contacto@') || lowerEmail.includes('contact@')) {
      type = 'general';
      confidence = 'high';
    } else if (lowerEmail.includes('ventas@') || lowerEmail.includes('sales@') || lowerEmail.includes('comercial@')) {
      type = 'sales';
      confidence = 'high';
    } else if (lowerEmail.includes('support@') || lowerEmail.includes('soporte@') || lowerEmail.includes('ayuda@')) {
      type = 'support';
      confidence = 'high';
    }

    // Lower confidence for personal email providers
    if (lowerEmail.includes('@gmail.') || lowerEmail.includes('@hotmail.') || lowerEmail.includes('@yahoo.')) {
      confidence = 'low';
      contactInfo.metadata.notes.push(`Email ${email} uses personal provider - verify corporate address`);
    }

    contactInfo.emails.push({ address: email, type, confidence, source: 'content' });
  });

  // Phone extraction (Ecuador format)
  const phoneRegex = /(\+593|0593|0)?[\s-]?([2-7]|9[0-9])[\s-]?[0-9]{3}[\s-]?[0-9]{3,4}/g;
  const phones = content.match(phoneRegex) || [];
  const uniquePhones = [...new Set(phones)];

  uniquePhones.forEach(phone => {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    let formattedPhone = cleanPhone;
    
    // Format to international
    if (cleanPhone.startsWith('0') && !cleanPhone.startsWith('0593')) {
      formattedPhone = '+593' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+')) {
      formattedPhone = '+593' + cleanPhone;
    }

    const isMobile = formattedPhone.includes('9');
    contactInfo.phones.push({
      number: formattedPhone,
      type: isMobile ? 'mobile' : 'landline',
      label: 'General',
      confidence: 'medium',
    });
  });

  // Social media extraction
  const socialPatterns = {
    linkedin: /linkedin\.com\/(company|in)\/([a-zA-Z0-9-]+)/i,
    facebook: /facebook\.com\/([a-zA-Z0-9.]+)/i,
    twitter: /(twitter|x)\.com\/([a-zA-Z0-9_]+)/i,
    instagram: /instagram\.com\/([a-zA-Z0-9_.]+)/i,
    youtube: /youtube\.com\/(channel|@)\/([a-zA-Z0-9_-]+)/i,
  };

  Object.entries(socialPatterns).forEach(([platform, regex]) => {
    const match = content.match(regex);
    if (match) {
      const fullUrl = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
      contactInfo.socialMedia[platform] = fullUrl;
    }
  });

  // Calculate confidence score
  let score = 0;
  if (contactInfo.emails.length > 0) score += 40;
  if (contactInfo.phones.length > 0) score += 30;
  if (Object.keys(contactInfo.socialMedia).length > 0) score += 20;
  if (contactInfo.emails.some((e: any) => e.confidence === 'high')) score += 10;
  
  contactInfo.metadata.confidenceScore = Math.min(score, 100);

  // Add notes
  if (contactInfo.emails.length === 0 && contactInfo.phones.length === 0) {
    contactInfo.metadata.notes.push('No contact information found. Try searching for a dedicated contact page.');
  }
  if (contactInfo.metadata.confidenceScore < 50) {
    contactInfo.metadata.notes.push('Low confidence extraction. Recommend manual verification.');
  }

  return contactInfo;
}

