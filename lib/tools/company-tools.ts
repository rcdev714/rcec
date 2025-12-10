import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SearchFilters, CompanySearchResult } from '@/types/chat';
import { FilterTranslator } from './filter-translator';
import { fetchCompanies, searchCompaniesBySector } from '@/lib/data/companies';
import { sortByRelevanceAndCompleteness, getCompletenessStats, calculateCompletenessScore } from '@/lib/data-completeness-scorer';
import { agentCache } from '@/lib/agents/enterprise-agent/cache';
import { createClient } from '@supabase/supabase-js';
import { Company } from '@/types/company';

// ============================================================================
// DISPLAY CONFIG TYPES
// ============================================================================

export type DisplayMode = 'single' | 'comparison' | 'list' | 'featured';

export interface CompanyDisplayConfig {
  mode: DisplayMode;
  featuredRUCs: string[];
  query?: string;
  totalCount?: number;
  selectionReason?: string;
}

// ============================================================================
// SMART DISPLAY CONFIG GENERATOR
// ============================================================================

/**
 * Analyzes the query and results to determine optimal display configuration
 */
function generateDisplayConfig(
  query: string,
  companies: Company[],
  totalCount: number
): CompanyDisplayConfig {
  const queryLower = query.toLowerCase();
  
  // 1. SINGLE COMPANY LOOKUP PATTERNS
  const singleLookupPatterns = [
    /\bRUC\s*:?\s*(\d{13})\b/i,                    // RUC lookup
    /^(?:busca|encuentra|dame|muestra|investiga)\s+(?:a\s+)?(?:la\s+)?empresa\s+(\w+)/i,  // "busca la empresa X"
    /^(?:qué|que)\s+(?:es|sabes)\s+(?:de|sobre)\s+(\w+)/i,  // "qué sabes de X"
    /^(?:info|información|detalles?)\s+(?:de|sobre)\s+/i,    // "info de X"
    /^(\w+)\s*-\s*(?:empresa|company)/i,            // "Pronaca - empresa"
  ];
  
  const isSingleLookup = singleLookupPatterns.some(p => p.test(queryLower));
  
  if (isSingleLookup && companies.length >= 1) {
    // Find the best matching company (highest completeness among first 3)
    const topCompanies = companies.slice(0, 3).filter(c => c.ruc);
    if (topCompanies.length === 0) {
      // Fallback if no valid RUCs
      return {
        mode: 'featured',
        featuredRUCs: [],
        query,
        totalCount,
      };
    }
    
    const bestMatch = topCompanies.reduce((best, curr) => {
      const bestScore = calculateCompletenessScore(best);
      const currScore = calculateCompletenessScore(curr);
      return currScore > bestScore ? curr : best;
    }, topCompanies[0]);
    
    return {
      mode: 'single',
      featuredRUCs: [bestMatch.ruc!],
      query,
      totalCount,
      selectionReason: `Mostrando ${bestMatch.nombre_comercial || bestMatch.nombre} (mejor coincidencia con datos más completos)`,
    };
  }
  
  // 2. COMPARISON PATTERNS
  const comparisonPatterns = [
    /\bcompara(?:r|ndo)?\b/i,
    /\bvs\.?\b/i,
    /\bentre\s+(\w+)\s+y\s+(\w+)/i,
    /\bdiferencia(?:s)?\s+entre\b/i,
    /\btop\s*(\d+)\b/i,
    /\bmejores?\s*(\d+)?\b/i,
  ];
  
  const isComparison = comparisonPatterns.some(p => p.test(queryLower));
  
  if (isComparison || (totalCount >= 2 && totalCount <= 5)) {
    // For comparison, pick top companies with best data quality
    const rankedCompanies = [...companies]
      .filter(c => c.ruc) // Filter out null RUCs
      .map(c => ({ company: c, score: calculateCompletenessScore(c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    return {
      mode: 'comparison',
      featuredRUCs: rankedCompanies.map(r => r.company.ruc!),
      query,
      totalCount,
      selectionReason: `Comparando las ${rankedCompanies.length} empresas con información más completa`,
    };
  }
  
  // 3. EXPLORATION/SEARCH PATTERNS (default)
  // For general searches, feature top 3-4 most relevant companies
  const featuredCount = Math.min(4, companies.length);
  const featured = companies.slice(0, featuredCount).filter(c => c.ruc);
  
  // Determine if this is a sector/category search
  const sectorPatterns = [
    /\b(?:empresas?|compañías?)\s+(?:de|del|en)\s+(?:el\s+)?(?:sector|rubro|industria)?\s*(\w+)/i,
    /\b(?:busca|encuentra|muestra|lista)\s+(?:empresas?|compañías?)/i,
    /\b(?:proveedores?|distribuidores?|fabricantes?)\s+(?:de\s+)?/i,
  ];
  
  const isExploration = sectorPatterns.some(p => p.test(queryLower)) || totalCount > 10;
  
  return {
    mode: isExploration ? 'featured' : 'featured',
    featuredRUCs: featured.map(c => c.ruc!),
    query,
    totalCount,
    selectionReason: totalCount > featuredCount 
      ? `Mostrando ${featuredCount} de ${totalCount} resultados (ordenados por relevancia y completitud de datos)`
      : undefined,
  };
}

// Helper to get Supabase client for backend tasks (bypassing cookies)
const getSupabaseClient = () => {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(sbUrl, sbKey, { auth: { persistSession: false } });
};

// Schema for search filters validation
const searchFiltersSchema = z.object({
  ruc: z.string().optional(),
  nombre: z.string().optional(),
  provincia: z.string().optional(),
  anio: z.string().optional(),
  nEmpleadosMin: z.string().optional(),
  nEmpleadosMax: z.string().optional(),
  ingresosVentasMin: z.string().optional(),
  ingresosVentasMax: z.string().optional(),
  activosMin: z.string().optional(),
  activosMax: z.string().optional(),
  patrimonioMin: z.string().optional(),
  patrimonioMax: z.string().optional(),
  impuestoRentaMin: z.string().optional(),
  impuestoRentaMax: z.string().optional(),
  utilidadAnImpMin: z.string().optional(),
  utilidadAnImpMax: z.string().optional(),
  utilidadNetaMin: z.string().optional(),
  utilidadNetaMax: z.string().optional(),
  nombreComercial: z.string().optional(),
});

/**
 * Tool for searching companies based on filters (location, size, financials)
 * 
 * DESIGN PRINCIPLE: This tool does ONE thing - filtered search by company attributes.
 * For sector/industry searches, use `search_companies_by_sector` instead.
 * Let the MODEL decide which tool is appropriate for the query.
 */
export const searchCompaniesTool = tool(
  async ({ query, limit = 10, page = 1 }: { query: string; limit?: number; page?: number }) => {
    try {
      // Translate natural language query to filters (location, size, financials)
      const filters = FilterTranslator.translateQuery(query);
      const validatedFilters = FilterTranslator.validateFilters(filters);
      
      // Ensure reasonable limits
      const actualLimit = Math.min(Math.max(limit, 1), 50);
      const actualPage = Math.max(page, 1);
      
      // Check cache first for performance
      const cacheKey = { ...validatedFilters, page: actualPage, limit: actualLimit };
      const cachedResult = agentCache.getCompanySearch(query, cacheKey);
      if (cachedResult) {
        console.log('[searchCompaniesTool] Cache HIT for query:', query);
        return cachedResult;
      }
      
      const supabase = getSupabaseClient();
      
      // Standard search using filters
      const searchParams = {
        ...validatedFilters,
        page: actualPage.toString(),
        pageSize: actualLimit,
      } as SearchFilters & { page: string; pageSize: number };
      
      const { companies, totalCount } = await fetchCompanies(searchParams, supabase);
      
      // Sort by relevance/completeness
      const shouldPreserveServerOrder = !!validatedFilters.sortBy && validatedFilters.sortBy !== 'completitud';
      const sortedCompanies = shouldPreserveServerOrder ? companies : sortByRelevanceAndCompleteness(companies);
      
      // Get completeness statistics
      const stats = getCompletenessStats(sortedCompanies);
      
      // Generate summary
      const filterSummary = FilterTranslator.generateFilterSummary(validatedFilters);
      
      const result: CompanySearchResult = {
        companies: sortedCompanies,
        totalCount,
        filters: validatedFilters,
        query,
      };
      
      // Generate smart display configuration
      const displayConfig = generateDisplayConfig(query, sortedCompanies, totalCount);
      
      // Simple summary for this filter-based tool
      const summary = `Encontré ${totalCount} empresas que coinciden con: ${filterSummary}. Los resultados se ordenan por completitud de datos.`;
      
      // Return structured result for the agent
      const toolResult = {
        success: true,
        result,
        displayConfig,
        summary,
        showingResults: `Mostrando ${sortedCompanies.length} de ${totalCount} resultados.`,
        appliedFilters: validatedFilters,
        dataQuality: stats,
        // Hint to the model about when to use sector search
        hint: validatedFilters.sector || validatedFilters.sectorText 
          ? 'TIP: Para búsquedas por sector/industria específica, usa search_companies_by_sector para mejores resultados.'
          : null,
      };
      
      // Cache successful results
      agentCache.cacheCompanySearch(query, cacheKey, toolResult);
      console.log('[searchCompaniesTool] Cached results for query:', query);
      
      return toolResult;
      
    } catch (error) {
      console.error('Error in searchCompaniesTool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ocurrió un error desconocido',
        suggestion: 'Intenta simplificar tu consulta o usar criterios más específicos',
      };
    }
  },
  {
    name: 'search_companies',
    description: `Buscar empresas en Ecuador por FILTROS ESTRUCTURADOS: ubicación, tamaño, métricas financieras.

**USA ESTA HERRAMIENTA CUANDO:**
- Busques por ubicación: "empresas en Guayaquil", "compañías en Pichincha"
- Busques por tamaño: "empresas con más de 100 empleados", "empresas grandes"
- Busques por finanzas: "empresas con ingresos > 1M", "empresas rentables"
- Busques empresa específica: "empresa con RUC 1790016919001", "Corporación Favorita"

**NO USES ESTA HERRAMIENTA CUANDO:**
- Busques por sector/industria: "empresas de alimentos", "proveedores de tecnología"
- Para sectores, USA \`search_companies_by_sector\` que tiene mejor relevancia

Ejemplos válidos:
- "Empresas en Guayaquil con más de 50 empleados"
- "Empresas rentables en Pichincha con ingresos > 500k"
- "Buscar empresa RUC 1790016919001"`,
    schema: z.object({
      query: z.string().describe('Consulta con filtros de ubicación, tamaño o finanzas'),
      limit: z.number().optional().default(10).describe('Máximo de resultados (default: 10, max: 50)'),
      page: z.number().optional().default(1).describe('Página para paginación'),
    }),
  }
);

/**
 * NEW: Dedicated tool for SECTOR/INDUSTRY searches
 * Uses PostgreSQL RPC with pg_trgm for semantic matching and CIIU codes
 * 
 * DESIGN: The MODEL decides when to use this tool based on the query intent
 */
export const searchCompaniesBySectorTool = tool(
  async ({ 
    sector, 
    keywords = [], 
    province, 
    minRevenue, 
    minEmployees,
    limit = 15 
  }: { 
    sector: string;
    keywords?: string[];
    province?: string;
    minRevenue?: number;
    minEmployees?: number;
    limit?: number;
  }) => {
    try {
      console.log('[searchCompaniesBySectorTool] Sector search:', { sector, keywords, province, minRevenue });
      
      // Import sector mappings
      const { SECTOR_KEYWORD_MAPPING, CIIU_SECTOR_MAPPING } = await import('./filter-translator');
      
      // Build keywords list from sector + provided keywords
      const sectorLower = sector.toLowerCase();
      const sectorKeywords = SECTOR_KEYWORD_MAPPING[sectorLower] || [];
      const allKeywords = [...new Set([...sectorKeywords, ...keywords, sectorLower])].filter(Boolean);
      
      // Get CIIU codes for the sector
      const ciuuPrefixes = CIIU_SECTOR_MAPPING[sectorLower] || [];
      
      if (allKeywords.length === 0 && ciuuPrefixes.length === 0) {
        return {
          success: false,
          error: `Sector "${sector}" no reconocido. Sectores válidos: alimentos, tecnologia, construccion, logistica, salud, financiero, comercio, manufactura, mineria, turismo, educacion, etc.`,
          suggestion: 'Intenta con un nombre de sector más común o usa search_companies con filtros específicos.',
        };
      }
      
      const supabase = getSupabaseClient();
      
      // Call the specialized RPC function
      const { companies } = await searchCompaniesBySector({
        sectorKeywords: allKeywords,
        ciuuPrefixes: ciuuPrefixes.length > 0 ? ciuuPrefixes : undefined,
        province,
        minRevenue,
        minEmployees,
        maxResults: Math.min(limit, 50),
      }, supabase);
      
      if (companies.length === 0) {
        return {
          success: true,
          result: { companies: [], totalCount: 0 },
          summary: `No encontré empresas del sector "${sector}"${province ? ` en ${province}` : ''}.`,
          suggestion: 'Intenta con criterios más amplios o usa web_search para encontrar empresas específicas del sector.',
        };
      }
      
      // Calculate match type statistics
      const matchTypes: Record<string, number> = {};
      let totalRelevance = 0;
      for (const company of companies) {
        matchTypes[company.sector_match_type] = (matchTypes[company.sector_match_type] || 0) + 1;
        totalRelevance += company.sector_relevance;
      }
      
      // Convert to Company-like format for UI compatibility
      const formattedCompanies = companies.map(c => ({
        id: c.id,
        ruc: c.ruc,
        nombre: c.nombre,
        nombre_comercial: c.nombre_comercial,
        provincia: c.provincia,
        descripcion: c.descripcion,
        ciiu: c.ciiu,
        ciiu_n1: c.ciiu_n1,
        segmento: c.segmento,
        ingresos_ventas: c.ingresos_ventas,
        n_empleados: c.n_empleados,
        utilidad_neta: c.utilidad_neta,
        anio: c.anio,
        // Sector-specific fields
        _sectorMatchType: c.sector_match_type,
        _sectorRelevance: c.sector_relevance,
      }));
      
      const displayConfig = generateDisplayConfig(sector, formattedCompanies as any, companies.length);
      
      return {
        success: true,
        result: {
          companies: formattedCompanies,
          totalCount: companies.length,
          query: sector,
        },
        displayConfig,
        summary: `Encontré ${companies.length} empresas del sector "${sector}"${province ? ` en ${province}` : ''}. Resultados ordenados por relevancia sectorial.`,
        sectorAnalysis: {
          sector,
          matchTypes, // e.g., { ciiu_exact: 8, descripcion_keyword: 2 }
          avgRelevance: totalRelevance / companies.length,
          topMatches: companies.slice(0, 3).map(c => ({
            nombre: c.nombre_comercial || c.nombre,
            ciiu: c.ciiu,
            matchType: c.sector_match_type,
          })),
          ciuuCodesUsed: ciuuPrefixes,
          keywordsUsed: allKeywords.slice(0, 5),
        },
      };
      
    } catch (error) {
      console.error('[searchCompaniesBySectorTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error en búsqueda por sector',
        suggestion: 'Intenta con search_companies o web_search como alternativa.',
      };
    }
  },
  {
    name: 'search_companies_by_sector',
    description: `Buscar empresas por SECTOR o INDUSTRIA específica. Usa clasificación CIIU y búsqueda semántica.

**USA ESTA HERRAMIENTA CUANDO:**
- El usuario menciona un sector: "empresas de alimentos", "proveedores de tecnología"
- Busca por industria: "sector inmobiliario", "industria farmacéutica"
- Busca proveedores/fabricantes: "fabricantes de textiles", "proveedores de logística"

**SECTORES SOPORTADOS:**
- Alimentos, Agrícola, Restaurantes
- Tecnología, Software, Telecomunicaciones
- Construcción, Inmobiliaria
- Logística, Transporte
- Salud, Farmacéutica
- Financiero, Seguros
- Comercio, Retail
- Manufactura, Textil, Químico
- Energía, Minería
- Consultoría, Educación, Turismo
- Automotriz, Publicidad, Seguridad

**VENTAJAS sobre search_companies:**
- Usa códigos CIIU internacionales para clasificación precisa
- Búsqueda semántica con pg_trgm similarity
- Retorna sector_match_type y sector_relevance para cada empresa

Ejemplos:
- sector: "alimentos", province: "PICHINCHA", minRevenue: 100000
- sector: "tecnologia", keywords: ["software", "SaaS"]
- sector: "inmobiliaria", province: "GUAYAS"`,
    schema: z.object({
      sector: z.string().describe('Nombre del sector/industria a buscar (ej: "alimentos", "tecnologia", "construccion")'),
      keywords: z.array(z.string()).optional().describe('Keywords adicionales para refinar la búsqueda'),
      province: z.string().optional().describe('Filtrar por provincia (ej: "PICHINCHA", "GUAYAS")'),
      minRevenue: z.number().optional().describe('Ingresos mínimos en USD'),
      minEmployees: z.number().optional().describe('Número mínimo de empleados'),
      limit: z.number().optional().default(15).describe('Máximo de resultados (default: 15)'),
    }),
  }
);

/**
 * Tool for getting detailed information about a specific company
 */
export const getCompanyDetailsTool = tool(
  async ({ identifier, type = 'ruc' }: { identifier: string; type?: 'ruc' | 'name' }) => {
    try {
      // Check cache for RUC lookups (most common case)
      const isRucLookup = type === 'ruc' || /^\d{13}$/.test(identifier);
      if (isRucLookup) {
        const cached = agentCache.getCompanyDetails(identifier);
        if (cached) {
          console.log('[getCompanyDetailsTool] Cache HIT for RUC:', identifier);
          return cached;
        }
      }
      
      let searchFilters: SearchFilters;
      
      if (isRucLookup) {
        searchFilters = { ruc: identifier };
      } else {
        searchFilters = { nombre: identifier };
      }
      
      const supabase = getSupabaseClient();
      const { companies, totalCount } = await fetchCompanies({ 
        ...searchFilters, 
        pageSize: 5 
      }, supabase);
      
      if (totalCount === 0) {
        return {
          success: false,
          error: `No se encontró empresa con ${type}: ${identifier}`,
          suggestion: 'Verifica el número RUC o intenta buscar por nombre de empresa',
        };
      }
      
      if (totalCount === 1) {
        const company = companies[0];
        const result = {
          success: true,
          company,
          // NEW: Display config for single company view
          displayConfig: {
            mode: 'single' as DisplayMode,
            featuredRUCs: [company.ruc],
            totalCount: 1,
          },
          summary: `Empresa encontrada: ${company.nombre || company.nombre_comercial}`,
          details: {
            ruc: company.ruc,
            name: company.nombre,
            commercialName: company.nombre_comercial,
            province: company.provincia,
            employees: company.n_empleados,
            revenue: company.ingresos_ventas,
            assets: company.activos,
            equity: company.patrimonio,
            netProfit: company.utilidad_neta,
            year: company.anio,
          },
        };
        
        // Cache by RUC for future lookups
        if (company.ruc) {
          agentCache.cacheCompanyDetails(company.ruc, result);
          console.log('[getCompanyDetailsTool] Cached details for RUC:', company.ruc);
        }
        
        return result;
      }
      
      // Multiple matches - return list for user to choose
      const topMatches = companies.slice(0, 5);
      return {
        success: true,
        multiple: true,
        companies: topMatches,
        // NEW: Display config for multiple matches
        displayConfig: {
          mode: 'comparison' as DisplayMode,
          featuredRUCs: topMatches.map(c => c.ruc),
          query: identifier,
          totalCount,
          selectionReason: `Encontré ${totalCount} empresas que coinciden con "${identifier}"`,
        },
        totalCount,
        summary: `Encontré ${totalCount} empresas que coinciden con "${identifier}". Mostrando los primeros 5 resultados.`,
        suggestion: 'Por favor especifica qué empresa quieres ver proporcionando el RUC exacto',
      };
      
    } catch (error) {
      console.error('Error in getCompanyDetailsTool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'No se pudieron obtener los detalles de la empresa',
        suggestion: 'Intenta usar un número RUC válido (13 dígitos) o verifica la ortografía del nombre de la empresa',
      };
    }
  },
  {
    name: 'get_company_details',
    description: `Obtener información detallada sobre una empresa específica por RUC o nombre. Esta herramienta obtiene datos completos de la empresa incluyendo historial financiero, detalles de contacto e información empresarial.

Usa esto cuando los usuarios quieren:
- Obtener detalles sobre una empresa específica
- Ver historial financiero
- Verificar información de contacto
- Analizar rendimiento de empresa a lo largo del tiempo`,
    schema: z.object({
      identifier: z.string().describe('RUC de empresa (13 dígitos) o nombre de empresa a buscar'),
      type: z.enum(['ruc', 'name']).optional().default('ruc').describe('Tipo de identificador: ruc o name'),
    }),
  }
);

/**
 * Tool for refining search results based on user feedback
 */
export const refineSearchTool = tool(
  async ({ originalQuery, refinement, currentFilters = {} }: { 
    originalQuery: string; 
    refinement: string; 
    currentFilters?: SearchFilters 
  }) => {
    try {
      // Parse refinement query
      const refinementFilters = FilterTranslator.translateQuery(refinement);
      
      // Combine current filters with refinement
      const combinedFilters = { ...currentFilters, ...refinementFilters };
      const validatedFilters = FilterTranslator.validateFilters(combinedFilters);
      
      // Execute refined search
      const supabase = getSupabaseClient();
      const { companies, totalCount } = await fetchCompanies({
        ...validatedFilters,
        pageSize: 10,
      }, supabase);
      
      const filterSummary = FilterTranslator.generateFilterSummary(validatedFilters);
      
      return {
        success: true,
        result: {
          companies,
          totalCount,
          filters: validatedFilters,
          query: `${originalQuery} + ${refinement}`,
        },
        summary: `Búsqueda refinada: ${filterSummary}`,
        showingResults: `Mostrando ${companies.length} de ${totalCount} resultados`,
        refinementApplied: refinement,
      };
      
    } catch (error) {
      console.error('Error in refineSearchTool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo refinar la búsqueda',
        suggestion: 'Intenta usar criterios de refinamiento más simples',
      };
    }
  },
  {
    name: 'refine_search',
    description: `Refinar resultados de búsqueda previos basado en retroalimentación del usuario o criterios adicionales. Esta herramienta ayuda a reducir o expandir resultados de búsqueda basado en solicitudes del usuario.

Usa esto cuando los usuarios quieren:
- Filtrar resultados previos más
- Agregar criterios adicionales a búsqueda actual
- Remover filtros específicos
- Ajustar parámetros de búsqueda`,
    schema: z.object({
      originalQuery: z.string().describe('La consulta de búsqueda original'),
      refinement: z.string().describe('Cómo refinar la búsqueda (ej: "solo mostrar empresas en Quito", "con más de 100 empleados")'),
      currentFilters: searchFiltersSchema.optional().describe('Filtros aplicados actualmente'),
    }),
  }
);

// Export all tools as an array for easy use in LangGraph
export const companyTools = [
  searchCompaniesTool,
  searchCompaniesBySectorTool, // NEW: Dedicated sector search - model decides when to use
  getCompanyDetailsTool,
  refineSearchTool,
];
