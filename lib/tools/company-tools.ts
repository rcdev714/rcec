import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SearchFilters, CompanySearchResult } from '@/types/chat';
import { FilterTranslator } from './filter-translator';
import { fetchCompanies } from '@/lib/data/companies';
import { exportCompaniesToExcel } from '@/app/actions/export-companies';
import { sortByRelevanceAndCompleteness, getCompletenessStats } from '@/lib/data-completeness-scorer';

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
 * Tool for searching companies based on natural language queries
 */
export const searchCompaniesTool = tool(
  async ({ query, limit = 10, page = 1 }: { query: string; limit?: number; page?: number }) => {
    try {
      // Translate natural language query to filters
      const filters = FilterTranslator.translateQuery(query);
      const validatedFilters = FilterTranslator.validateFilters(filters);
      
      // Ensure reasonable limits
      const actualLimit = Math.min(Math.max(limit, 1), 50);
      const actualPage = Math.max(page, 1);
      
      // Fetch companies using existing API
      const searchParams = {
        ...validatedFilters,
        page: actualPage.toString(),
        pageSize: actualLimit,
      };
      
      const { companies, totalCount } = await fetchCompanies(searchParams);
      
      // Sort companies by data completeness and relevance
      const sortedCompanies = sortByRelevanceAndCompleteness(companies);
      
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
      
      // Return structured result for the agent
      return {
        success: true,
        result,
        summary: `Encontré ${totalCount} empresas que coinciden con: ${filterSummary}. Los resultados se ordenan por relevancia, priorizando empresas con información de contacto completa y datos financieros recientes.`,
        showingResults: `Mostrando ${sortedCompanies.length} de ${totalCount} resultados. Cargar más mostrará el siguiente grupo de empresas relevantes.`,
        appliedFilters: validatedFilters,
        dataQuality: stats,
      };
      
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
    description: `Buscar empresas en Ecuador basado en varios criterios. Esta herramienta puede entender consultas en lenguaje natural y convertirlas a filtros apropiados.

Ejemplos de consultas que puedes manejar:
- "Muéstrame empresas rentables en Guayaquil con más de 50 empleados"
- "Encuentra empresas tecnológicas con ingresos entre 1M y 5M"
- "Empresas en Pichincha del 2023"
- "Empresas manufactureras grandes"
- "Empresas rentables en el sector turismo"

La herramienta automáticamente traducirá lenguaje natural a filtros apropiados para:
- Ubicación (provincias/ciudades)
- Tamaño de empresa (rangos de número de empleados)
- Métricas financieras (ingresos, utilidad, activos)
- Períodos de tiempo (años fiscales)
- Nombres de empresa o números RUC`,
    schema: z.object({
      query: z.string().describe('Consulta en lenguaje natural describiendo las empresas a buscar'),
      limit: z.number().optional().default(10).describe('Número máximo de resultados a retornar (por defecto: 10, máximo: 50)'),
      page: z.number().optional().default(1).describe('Número de página para paginación'),
    }),
  }
);

/**
 * Tool for exporting companies to Excel based on search criteria
 */
export const exportCompaniesTool = tool(
  async ({ query, sessionId }: { query: string; sessionId?: string }) => {
    try {
      // Translate query to filters
      const filters = FilterTranslator.translateQuery(query);
      const validatedFilters = FilterTranslator.validateFilters(filters);
      
      // Generate export using existing functionality
      const exportParams = {
        ...validatedFilters,
        exportAll: true, // Export all matching records, not just first page
      };
      
      const exportResult = await exportCompaniesToExcel(exportParams, sessionId);
      
      // Generate summary
      const filterSummary = FilterTranslator.generateFilterSummary(validatedFilters);
      
      return {
        success: true,
        filename: exportResult.filename,
        recordCount: exportResult.recordCount,
        summary: `Exportación generada: ${exportResult.recordCount} empresas que coinciden con ${filterSummary}`,
        downloadReady: true,
        filters: validatedFilters,
        // Note: In a real implementation, you'd need to handle file storage and provide download URL
        // For now, the file buffer is generated but needs proper file serving
      };
      
    } catch (error) {
      console.error('Error in exportCompaniesTool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'La exportación falló',
        suggestion: 'Intenta simplificar tus criterios de búsqueda o verifica si los filtros son válidos',
      };
    }
  },
  {
    name: 'export_companies',
    description: `Exportar empresas a archivo Excel basado en criterios de búsqueda. Esta herramienta genera archivos Excel descargables con datos de empresas que coinciden con los filtros especificados.

Usa esta herramienta cuando los usuarios quieren:
- Descargar resultados de búsqueda
- Exportar listas filtradas de empresas
- Generar reportes para análisis offline
- Crear datos para presentaciones o análisis

La exportación incluye toda la información disponible de la empresa: datos financieros, detalles de contacto, ubicación, etc.`,
    schema: z.object({
      query: z.string().describe('Consulta en lenguaje natural describiendo qué empresas exportar'),
      sessionId: z.string().optional().describe('ID de sesión para rastrear progreso de exportación'),
    }),
  }
);

/**
 * Tool for getting detailed information about a specific company
 */
export const getCompanyDetailsTool = tool(
  async ({ identifier, type = 'ruc' }: { identifier: string; type?: 'ruc' | 'name' }) => {
    try {
      let searchFilters: SearchFilters;
      
      if (type === 'ruc' || /^\d{13}$/.test(identifier)) {
        searchFilters = { ruc: identifier };
      } else {
        searchFilters = { nombre: identifier };
      }
      
      const { companies, totalCount } = await fetchCompanies({ 
        ...searchFilters, 
        pageSize: 5 
      });
      
      if (totalCount === 0) {
        return {
          success: false,
          error: `No se encontró empresa con ${type}: ${identifier}`,
          suggestion: 'Verifica el número RUC o intenta buscar por nombre de empresa',
        };
      }
      
      if (totalCount === 1) {
        const company = companies[0];
        return {
          success: true,
          company,
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
      }
      
      // Multiple matches - return list for user to choose
      return {
        success: true,
        multiple: true,
        companies: companies.slice(0, 5),
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
      const { companies, totalCount } = await fetchCompanies({
        ...validatedFilters,
        pageSize: 10,
      });
      
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
  exportCompaniesTool,
  getCompanyDetailsTool,
  refineSearchTool,
];
