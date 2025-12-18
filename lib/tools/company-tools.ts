import { tool } from '@langchain/core/tools';
import { z } from 'zod';
// These types are kept for potential future use
import type { SearchFilters as _SearchFilters, CompanySearchResult as _CompanySearchResult } from '@/types/chat';
import { FilterTranslator } from './filter-translator';
// These functions are kept for potential future use
import { sortByRelevanceAndCompleteness as _sortByRelevanceAndCompleteness, getCompletenessStats as _getCompletenessStats, calculateCompletenessScore as _calculateCompletenessScore } from '@/lib/data-completeness-scorer';
import { agentCache } from '@/lib/agents/enterprise-agent/cache';
import { createClient } from '@supabase/supabase-js';
import type { Company as _Company } from '@/types/company';

const stripDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeKey = (value: string) => stripDiacritics(value).trim().toLowerCase();

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

// Helper to get Supabase client for backend tasks
const getSupabaseClient = () => {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(sbUrl, sbKey, { auth: { persistSession: false } });
};

// ============================================================================
// TOOL 1: LOOKUP COMPANY BY RUC (Exact lookup - most reliable)
// 
// This is the PRIMARY tool for getting company data when you have a RUC.
// Returns COMPLETE financial data from official government sources.
// ============================================================================

export const lookupCompanyByRucTool = tool(
  async ({ ruc }: { ruc: string }) => {
    try {
      const cleanRuc = ruc.trim().replace(/\D/g, '');
      
      if (cleanRuc.length !== 13) {
        return {
          success: false,
          error: `El RUC debe tener 13 dígitos. Recibido: "${ruc}" (${cleanRuc.length} dígitos)`,
          suggestion: 'Verifica el RUC. Si no tienes el RUC, usa search_company_by_name para buscarlo.',
        };
      }
      
      // Check cache
      const cached = agentCache.getCompanyDetails(cleanRuc);
      if (cached) {
        console.log('[lookupCompanyByRucTool] Cache HIT:', cleanRuc);
        return cached;
      }
      
      const supabase = getSupabaseClient();
      
      console.log('[lookupCompanyByRucTool] Looking up RUC:', cleanRuc);
      
      const { data, error } = await supabase.rpc('get_company_by_ruc', { p_ruc: cleanRuc });
      
      if (error) {
        console.error('[lookupCompanyByRucTool] Error:', error);
        throw new Error(`Error en búsqueda: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        return {
          success: false,
          error: `No se encontró empresa con RUC ${cleanRuc}`,
          suggestion: 'Verifica que el RUC sea correcto. Si buscas por nombre, usa search_company_by_name.',
        };
      }
      
      const company = data[0];
      
      const result = {
        success: true,
        empresa: {
          // Identificación
          ruc: company.ruc,
          nombre: company.nombre,
          nombreComercial: company.nombre_comercial,
          expediente: company.expediente,
          
          // Ubicación
          provincia: company.provincia?.trim(),
          canton: company.canton,
          ciudad: company.ciudad,
          
          // Clasificación
          ciiu: company.ciiu,
          descripcionActividad: company.descripcion,
          segmento: company.segmento, // GRANDE, MEDIANA, PEQUEÑA, MICROEMPRESA
          tipo: company.tipo,
          tipoEmpresa: company.tipo_empresa,
          estadoEmpresa: company.estado_empresa,
          fechaConstitucion: company.fecha_constitucion,
          
          // DATOS FINANCIEROS (año fiscal más reciente)
          anioFiscal: company.anio,
          empleados: company.n_empleados,
          
          // Estado de Resultados
          ingresosVentas: company.ingresos_ventas,
          ingresosTotales: company.ingresos_totales,
          utilidadNeta: company.utilidad_neta,
          utilidadAntesImpuestos: company.utilidad_an_imp,
          impuestoRenta: company.impuesto_renta,
          gastosFinancieros: company.gastos_financieros,
          gastosAdminVentas: company.gastos_admin_ventas,
          costosVentasProduccion: company.costos_ventas_prod,
          
          // Balance General
          activos: company.activos,
          patrimonio: company.patrimonio,
          deudaTotal: company.deuda_total,
          
          // Ratios Financieros
          roe: company.roe, // Return on Equity
          roa: company.roa, // Return on Assets
          liquidezCorriente: company.liquidez_corriente,
          pruebaAcida: company.prueba_acida,
          margenBruto: company.margen_bruto,
          margenOperacional: company.margen_operacional,
        },
        fuente: 'Base de datos oficial - Superintendencia de Compañías Ecuador',
        disclaimer: 'Datos financieros del año fiscal indicado. Para años anteriores, consultar historial.',
      };
      
      // Cache it
      agentCache.cacheCompanyDetails(cleanRuc, result);
      
      return result;
      
    } catch (error) {
      console.error('[lookupCompanyByRucTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        suggestion: 'Intenta de nuevo o verifica que el RUC sea válido.',
      };
    }
  },
  {
    name: 'lookup_company_by_ruc',
    description: `🎯 BÚSQUEDA EXACTA POR RUC - La forma MÁS CONFIABLE de obtener datos de una empresa.

⚡ USA ESTA HERRAMIENTA CUANDO:
- Tienes el RUC (13 dígitos) de una empresa
- Necesitas estados financieros oficiales
- Quieres datos precisos y verificados

📊 DATOS QUE RETORNA (fuente oficial Superintendencia de Compañías):
- Identificación: RUC, nombre, expediente
- Ubicación: provincia, cantón, ciudad
- Clasificación: CIIU, segmento (GRANDE/MEDIANA/PEQUEÑA/MICRO)
- ESTADOS FINANCIEROS COMPLETOS:
  * Ingresos y ventas
  * Utilidad neta y antes de impuestos
  * Activos totales
  * Patrimonio
  * Deuda total
  * Empleados
- RATIOS FINANCIEROS: ROE, ROA, liquidez, márgenes

⚠️ NO USES ESTA HERRAMIENTA SI:
- No tienes el RUC exacto (usa search_company_by_name en su lugar)
- Buscas múltiples empresas (usa search_companies_advanced)

📌 EJEMPLO: lookup_company_by_ruc("1790016919001") → Corporación Favorita completa`,
    schema: z.object({
      ruc: z.string().describe('RUC de la empresa (13 dígitos)'),
    }),
  }
);

// ============================================================================
// TOOL 2: SEARCH COMPANY BY NAME (Fuzzy name search)
//
// Use when you know the company name but not the RUC.
// Returns matches with similarity scores.
// ============================================================================

export const searchCompanyByNameTool = tool(
  async ({ name, province }: { name: string; province?: string }) => {
    try {
      const normalizedName = stripDiacritics(name).trim();
      
      if (normalizedName.length < 2) {
        return {
          success: false,
          error: 'El nombre debe tener al menos 2 caracteres',
        };
      }
      
      const supabase = getSupabaseClient();
      
      console.log('[searchCompanyByNameTool] Searching for:', normalizedName);
      
      const { data, error } = await supabase.rpc('search_companies_by_name', {
        p_search_term: normalizedName,
        p_provincia: province || null,
        p_limit: 10,
      });
      
      if (error) {
        console.error('[searchCompanyByNameTool] Error:', error);
        throw new Error(`Error en búsqueda: ${error.message}`);
      }
      
      const companies = data || [];
      
      if (companies.length === 0) {
        return {
          success: true,
          encontradas: 0,
          empresas: [],
          sugerencia: 'No se encontraron empresas. Intenta con otro nombre o verifica la ortografía.',
        };
      }
      
      return {
        success: true,
        encontradas: companies.length,
        empresas: companies.map((c: any) => ({
          ruc: c.ruc,
          nombre: c.nombre,
          nombreComercial: c.nombre_comercial,
          provincia: c.provincia?.trim(),
          segmento: c.segmento,
          anio: c.anio,
          empleados: c.n_empleados,
          ingresos: c.ingresos_ventas,
          utilidadNeta: c.utilidad_neta,
          coincidencia: Math.round((c.similarity_score || 0) * 100) + '%',
        })),
        instruccion: 'Para obtener estados financieros COMPLETOS, usa lookup_company_by_ruc con el RUC deseado.',
      };
      
    } catch (error) {
      console.error('[searchCompanyByNameTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
  {
    name: 'search_company_by_name',
    description: `🔍 BUSCAR EMPRESA POR NOMBRE - Encuentra el RUC cuando solo tienes el nombre.

⚡ USA ESTA HERRAMIENTA CUANDO:
- Conoces el nombre de la empresa pero NO el RUC
- El usuario menciona una empresa sin dar el RUC
- Quieres verificar si una empresa existe en la base de datos

📊 RETORNA:
- Lista de empresas que coinciden con el nombre
- RUC de cada empresa (para luego usar lookup_company_by_ruc)
- Datos básicos: ubicación, tamaño, ingresos
- Porcentaje de coincidencia

🔄 FLUJO TÍPICO:
1. Usuario dice "información de Pronaca"
2. Usa search_company_by_name("Pronaca") → Obtiene RUC 1790319857001
3. Usa lookup_company_by_ruc("1790319857001") → Estados financieros completos

📌 EJEMPLO: search_company_by_name("favorita") → Lista de empresas con "favorita" en el nombre`,
    schema: z.object({
      name: z.string().describe('Nombre de la empresa a buscar'),
      province: z.string().optional().describe('Filtrar por provincia (PICHINCHA, GUAYAS, etc.)'),
    }),
  }
);

// ============================================================================
// TOOL 3: SEARCH COMPANIES ADVANCED (Multi-filter search)
//
// For complex searches with multiple criteria.
// ============================================================================

export const searchCompaniesAdvancedTool = tool(
  async ({
    provincia,
    sector,
    minEmpleados,
    maxEmpleados,
    minIngresos,
    maxIngresos,
    rentables,
    limit = 20,
  }: {
    provincia?: string;
    sector?: string;
    minEmpleados?: number;
    maxEmpleados?: number;
    minIngresos?: number;
    maxIngresos?: number;
    rentables?: boolean;
    limit?: number;
  }) => {
    try {
      const supabase = getSupabaseClient();
      
      // If sector is provided, use sector search
      if (sector) {
        const { SECTOR_KEYWORD_MAPPING, CIIU_SECTOR_MAPPING } = await import('./filter-translator');
        const sectorLower = normalizeKey(sector);
        const sectorKeywords = SECTOR_KEYWORD_MAPPING[sectorLower] || [sector];
        const ciuuPrefixes = CIIU_SECTOR_MAPPING[sectorLower] || [];
        
        console.log('[searchCompaniesAdvancedTool] Sector search:', sector);
        
        const { data, error } = await supabase.rpc('search_companies_by_sector', {
          p_sector_keywords: sectorKeywords,
          p_ciiu_prefixes: ciuuPrefixes.length > 0 ? ciuuPrefixes : null,
          p_province_filter: provincia || null,
          p_min_revenue: minIngresos || null,
          p_min_employees: minEmpleados || null,
          p_max_results: Math.min(limit, 50),
        });
        
        if (error) throw new Error(error.message);
        
        const companies = (data || []).map((c: any) => ({
          ruc: c.ruc,
          nombre: c.nombre,
          nombreComercial: c.nombre_comercial,
          provincia: c.provincia?.trim(),
          actividad: c.descripcion?.substring(0, 100),
          ciiu: c.ciiu,
          segmento: c.segmento,
          anio: c.anio,
          empleados: c.n_empleados,
          ingresos: c.ingresos_ventas,
          utilidadNeta: c.utilidad_neta,
        }));
        
        return {
          success: true,
          encontradas: companies.length,
          filtros: { sector, provincia, minEmpleados, minIngresos },
          empresas: companies,
          instruccion: 'Para estados financieros completos de una empresa, usa lookup_company_by_ruc con su RUC.',
        };
      }
      
      // Otherwise use filtered search
      console.log('[searchCompaniesAdvancedTool] Filtered search');
      
      const { data, error } = await supabase.rpc('search_companies_filtered', {
        p_ruc: null,
        p_nombre: null,
        p_nombre_comercial: null,
        p_provincia: provincia || null,
        p_ciiu_prefix: null,
        p_segmento: null,
        p_min_empleados: minEmpleados || null,
        p_max_empleados: maxEmpleados || null,
        p_min_ingresos: minIngresos || null,
        p_max_ingresos: maxIngresos || null,
        p_min_utilidad: rentables ? 1 : null,
        p_anio: null,
        p_limit: Math.min(limit, 50),
        p_offset: 0,
      });
      
      if (error) throw new Error(error.message);
      
      const companies = (data || []).map((c: any) => ({
        ruc: c.ruc,
        nombre: c.nombre,
        nombreComercial: c.nombre_comercial,
        provincia: c.provincia?.trim(),
        actividad: c.descripcion?.substring(0, 100),
        ciiu: c.ciiu,
        segmento: c.segmento,
        anio: c.anio,
        empleados: c.n_empleados,
        ingresos: c.ingresos_ventas,
        utilidadNeta: c.utilidad_neta,
      }));
      
      const totalCount = companies.length > 0 && (data[0] as any).total_count 
        ? Number((data[0] as any).total_count) 
        : companies.length;
      
      return {
        success: true,
        encontradas: totalCount,
        mostrando: companies.length,
        filtros: { provincia, minEmpleados, maxEmpleados, minIngresos, maxIngresos, rentables },
        empresas: companies,
        instruccion: 'Para estados financieros completos de una empresa, usa lookup_company_by_ruc con su RUC.',
      };
      
    } catch (error) {
      console.error('[searchCompaniesAdvancedTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
  {
    name: 'search_companies_advanced',
    description: `📋 BÚSQUEDA AVANZADA - Encuentra empresas con múltiples filtros.

⚡ USA ESTA HERRAMIENTA CUANDO:
- Necesitas listar empresas de un sector específico
- Quieres filtrar por ubicación, tamaño o ingresos
- Buscas empresas con características específicas

📊 FILTROS DISPONIBLES:
- sector: "alimentos", "tecnologia", "construccion", etc.
- provincia: "PICHINCHA", "GUAYAS", "AZUAY", etc.
- minEmpleados/maxEmpleados: Rango de empleados
- minIngresos/maxIngresos: Rango de ingresos (USD)
- rentables: true = solo empresas con utilidad positiva

🔄 FLUJO TÍPICO:
1. search_companies_advanced(sector: "tecnologia", provincia: "PICHINCHA")
2. Revisar lista de empresas con RUCs
3. lookup_company_by_ruc para detalles de las más interesantes

📌 SECTORES: alimentos, tecnologia, software, construccion, inmobiliaria, logistica, salud, farmaceutica, financiero, comercio, manufactura, energia, mineria, educacion, turismo`,
    schema: z.object({
      provincia: z.string().optional().describe('Provincia (PICHINCHA, GUAYAS, etc.)'),
      sector: z.string().optional().describe('Sector/industria (alimentos, tecnologia, etc.)'),
      minEmpleados: z.number().optional().describe('Mínimo de empleados'),
      maxEmpleados: z.number().optional().describe('Máximo de empleados'),
      minIngresos: z.number().optional().describe('Ingresos mínimos (USD)'),
      maxIngresos: z.number().optional().describe('Ingresos máximos (USD)'),
      rentables: z.boolean().optional().describe('Solo empresas con utilidad positiva'),
      limit: z.number().optional().default(20).describe('Máximo de resultados'),
    }),
  }
);

// ============================================================================
// TOOL 4: GET COMPANY FINANCIALS HISTORY (Multi-year financial data)
//
// For getting historical financial data across multiple years.
// ============================================================================

export const getCompanyFinancialsHistoryTool = tool(
  async ({ ruc }: { ruc: string }) => {
    try {
      const cleanRuc = ruc.trim().replace(/\D/g, '');
      
      if (cleanRuc.length !== 13) {
        return {
          success: false,
          error: `El RUC debe tener 13 dígitos. Recibido: ${cleanRuc.length} dígitos`,
        };
      }
      
      const supabase = getSupabaseClient();
      
      console.log('[getCompanyFinancialsHistoryTool] Getting history for RUC:', cleanRuc);
      
      // Get all years for this company
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('ruc', cleanRuc)
        .order('anio', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      if (!data || data.length === 0) {
        return {
          success: false,
          error: `No se encontró historial para RUC ${cleanRuc}`,
        };
      }
      
      const company = data[0];
      const years = data.map((record: any) => ({
        anio: record.anio,
        ingresos: record.ingresos_ventas,
        utilidadNeta: record.utilidad_neta,
        activos: record.activos,
        patrimonio: record.patrimonio,
        empleados: record.n_empleados,
        roe: record.roe,
        roa: record.roa,
        margenBruto: record.margen_bruto,
      }));
      
      // Calculate growth rates
      const latestYear = years[0];
      const previousYear = years.length > 1 ? years[1] : null;
      
      let crecimiento = null;
      if (previousYear && latestYear.ingresos && previousYear.ingresos) {
        crecimiento = {
          ingresos: ((latestYear.ingresos - previousYear.ingresos) / previousYear.ingresos * 100).toFixed(1) + '%',
          utilidad: previousYear.utilidadNeta 
            ? ((latestYear.utilidadNeta - previousYear.utilidadNeta) / Math.abs(previousYear.utilidadNeta) * 100).toFixed(1) + '%'
            : 'N/A',
          empleados: previousYear.empleados
            ? ((latestYear.empleados - previousYear.empleados) / previousYear.empleados * 100).toFixed(1) + '%'
            : 'N/A',
        };
      }
      
      return {
        success: true,
        empresa: {
          ruc: company.ruc,
          nombre: company.nombre,
          nombreComercial: company.nombre_comercial,
          provincia: company.provincia?.trim(),
          segmento: company.segmento,
        },
        aniosDisponibles: years.length,
        historialFinanciero: years,
        crecimiento: crecimiento,
        fuente: 'Base de datos oficial - Superintendencia de Compañías Ecuador',
      };
      
    } catch (error) {
      console.error('[getCompanyFinancialsHistoryTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
  {
    name: 'get_company_financials_history',
    description: `📈 HISTORIAL FINANCIERO - Obtener estados financieros de MÚLTIPLES AÑOS.

⚡ USA ESTA HERRAMIENTA CUANDO:
- Necesitas analizar la evolución financiera de una empresa
- Quieres calcular tasas de crecimiento
- Requieres comparar rendimiento año a año

📊 RETORNA:
- Datos financieros de cada año disponible (2020-2024)
- Ingresos, utilidad, activos, patrimonio por año
- Ratios financieros históricos (ROE, ROA, márgenes)
- Cálculo automático de crecimiento interanual

📌 EJEMPLO: get_company_financials_history("1790016919001") → 5 años de datos de Corporación Favorita`,
    schema: z.object({
      ruc: z.string().describe('RUC de la empresa (13 dígitos)'),
    }),
  }
);

// ============================================================================
// TOOL 5: LIST TOP COMPANIES (Quick listing by metric)
//
// Simple tool to get top companies by a metric.
// ============================================================================

export const listTopCompaniesTool = tool(
  async ({
    metric = 'ingresos',
    provincia,
    ciiu_section,
    limit = 20,
  }: {
    metric?: string;
    provincia?: string;
    ciiu_section?: string;
    limit?: number;
  }) => {
    try {
      const supabase = getSupabaseClient();
      
      const sortByMap: Record<string, string> = {
        ingresos: 'ingresos_ventas',
        empleados: 'n_empleados',
        utilidad: 'utilidad_neta',
        activos: 'activos',
      };
      
      const sortBy = sortByMap[metric] || 'ingresos_ventas';
      
      console.log('[listTopCompaniesTool] Listing top by:', metric);
      
      const { data, error } = await supabase.rpc('list_companies', {
        p_provincia: provincia || null,
        p_ciiu_section: ciiu_section || null,
        p_sort_by: sortBy,
        p_sort_dir: 'desc',
        p_limit: Math.min(limit, 50),
        p_offset: 0,
      });
      
      if (error) throw new Error(error.message);
      
      const companies = (data || []).map((c: any, idx: number) => ({
        posicion: idx + 1,
        ruc: c.ruc,
        nombre: c.nombre,
        nombreComercial: c.nombre_comercial,
        provincia: c.provincia?.trim(),
        segmento: c.segmento,
        anio: c.anio,
        empleados: c.n_empleados,
        ingresos: c.ingresos_ventas,
        utilidadNeta: c.utilidad_neta,
      }));
      
      return {
        success: true,
        ordenadoPor: metric,
        filtros: { provincia, ciiu_section },
        totalEncontradas: companies.length,
        ranking: companies,
        instruccion: 'Para estados financieros completos, usa lookup_company_by_ruc con el RUC deseado.',
      };
      
    } catch (error) {
      console.error('[listTopCompaniesTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
  {
    name: 'list_top_companies',
    description: `🏆 RANKING DE EMPRESAS - Lista las empresas top por una métrica.

⚡ USA ESTA HERRAMIENTA CUANDO:
- Quieres ver las empresas más grandes de una provincia
- Necesitas un ranking por ingresos, empleados o utilidad
- Buscas los líderes de un sector

📊 MÉTRICAS DISPONIBLES:
- ingresos: Por facturación/ventas (default)
- empleados: Por número de trabajadores
- utilidad: Por utilidad neta
- activos: Por total de activos

📊 FILTROS OPCIONALES:
- provincia: PICHINCHA, GUAYAS, AZUAY, etc.
- ciiu_section: A (Agricultura), C (Manufactura), G (Comercio), etc.

📌 EJEMPLO: list_top_companies(metric: "ingresos", provincia: "GUAYAS", limit: 10)`,
    schema: z.object({
      metric: z.string().optional().default('ingresos').describe('Métrica: ingresos, empleados, utilidad, activos'),
      provincia: z.string().optional().describe('Filtrar por provincia'),
      ciiu_section: z.string().optional().describe('Filtrar por sección CIIU (A, C, G, etc.)'),
      limit: z.number().optional().default(20).describe('Cantidad de empresas'),
    }),
  }
);

// ============================================================================
// LEGACY TOOLS (for backward compatibility)
// ============================================================================

// Wrapper for old search_companies calls
export const searchCompaniesTool = tool(
  async ({ query, limit = 15, page: _page = 1 }: { query: string; limit?: number; page?: number }) => {
    try {
      const normalizedQuery = stripDiacritics(query).trim();
      
      // Check for RUC pattern
      const rucMatch = normalizedQuery.match(/\b(\d{13})\b/);
      if (rucMatch) {
        // Redirect to exact RUC lookup
        const result = await lookupCompanyByRucTool.func({ ruc: rucMatch[1] });
        return {
          ...result,
          _redirectedFrom: 'search_companies',
          _hint: 'Para búsquedas por RUC, usa lookup_company_by_ruc directamente.',
        };
      }
      
      // Parse filters
      const filters = FilterTranslator.translateQuery(normalizedQuery);
      
      // If it looks like a company name search
      if (!filters.provincia && !filters.sector && !filters.nEmpleadosMin && normalizedQuery.length >= 3) {
        const result = await searchCompanyByNameTool.func({ name: normalizedQuery });
        return {
          ...result,
          _redirectedFrom: 'search_companies',
          _hint: 'Para búsquedas por nombre, usa search_company_by_name directamente.',
        };
      }
      
      // Otherwise do advanced search
      const result = await searchCompaniesAdvancedTool.func({
        provincia: filters.provincia,
        sector: filters.sector,
        minEmpleados: filters.nEmpleadosMin ? parseInt(filters.nEmpleadosMin) : undefined,
        maxEmpleados: filters.nEmpleadosMax ? parseInt(filters.nEmpleadosMax) : undefined,
        minIngresos: filters.ingresosVentasMin ? parseFloat(filters.ingresosVentasMin) : undefined,
        maxIngresos: filters.ingresosVentasMax ? parseFloat(filters.ingresosVentasMax) : undefined,
        rentables: filters.utilidadNetaMin ? parseFloat(filters.utilidadNetaMin) > 0 : undefined,
        limit,
      });
      
      return {
        ...result,
        _redirectedFrom: 'search_companies',
      };
      
    } catch (error) {
      console.error('[searchCompaniesTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
  {
    name: 'search_companies',
    description: `🔍 BÚSQUEDA GENERAL (Legacy) - Intenta interpretar la consulta y usar la herramienta correcta.

⚠️ NOTA: Esta herramienta es un wrapper que redirige a herramientas más específicas.
Es mejor usar directamente:
- lookup_company_by_ruc → Si tienes el RUC
- search_company_by_name → Si buscas por nombre
- search_companies_advanced → Si necesitas filtros
- list_top_companies → Si quieres un ranking`,
    schema: z.object({
      query: z.string().describe('Consulta de búsqueda'),
      limit: z.number().optional().default(15),
      page: z.number().optional().default(1),
    }),
  }
);

// Wrapper for old get_company_details calls
export const getCompanyDetailsTool = tool(
  async ({ identifier, type }: { identifier: string; type?: 'ruc' | 'name' }) => {
    const isRuc = type === 'ruc' || /^\d{13}$/.test(identifier.trim());
    
    if (isRuc) {
      const result = await lookupCompanyByRucTool.func({ ruc: identifier });
      return { ...result, _redirectedFrom: 'get_company_details' };
    } else {
      const result = await searchCompanyByNameTool.func({ name: identifier });
      return { ...result, _redirectedFrom: 'get_company_details' };
    }
  },
  {
    name: 'get_company_details',
    description: `📋 DETALLES DE EMPRESA (Legacy) - Wrapper para lookup_company_by_ruc y search_company_by_name.

⚠️ MEJOR USAR:
- lookup_company_by_ruc → Si tienes el RUC (más rápido y preciso)
- search_company_by_name → Si solo tienes el nombre`,
    schema: z.object({
      identifier: z.string().describe('RUC (13 dígitos) o nombre'),
      type: z.enum(['ruc', 'name']).optional().describe('Tipo de identificador'),
    }),
  }
);

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const companyTools = [
  // PRIMARY TOOLS (use these!)
  lookupCompanyByRucTool,         // #1 for exact RUC lookup
  searchCompanyByNameTool,        // #2 for finding RUC by name
  searchCompaniesAdvancedTool,    // #3 for multi-filter search
  getCompanyFinancialsHistoryTool, // #4 for historical analysis
  listTopCompaniesTool,           // #5 for rankings
  
  // LEGACY WRAPPERS (for backward compatibility)
  searchCompaniesTool,            // Redirects to specific tools
  getCompanyDetailsTool,          // Redirects to specific tools
];

// Export individual tools for direct imports
export {
  lookupCompanyByRucTool as lookupByRuc,
  searchCompanyByNameTool as searchByName,
  searchCompaniesAdvancedTool as searchAdvanced,
  getCompanyFinancialsHistoryTool as getFinancialsHistory,
  listTopCompaniesTool as listTop,
};
