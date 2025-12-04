import { createClient } from "@/lib/supabase/server";
import { Company } from "@/types/company";
import { SupabaseClient } from "@supabase/supabase-js";

const sanitizeTextParam = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const escapeForILike = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/[%_]/g, (char) => `\\${char}`);

const buildContainsPattern = (value: string) =>
  `%${escapeForILike(value)}%`;

const buildPrefixPattern = (value: string) =>
  `${escapeForILike(value)}%`;

const SORTABLE_FIELDS = ['completitud', 'ingresos_ventas', 'n_empleados', 'utilidad_neta', 'activos', 'anio'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

// ============================================================================
// ENHANCED SEMANTIC SEARCH TYPES
// ============================================================================

export interface SectorSearchResult {
  id: number;
  ruc: string | null;
  nombre: string | null;
  nombre_comercial: string | null;
  provincia: string | null;
  descripcion: string | null;
  ciiu: string | null;
  ciiu_n1: string | null;
  segmento: string | null;
  ingresos_ventas: number | null;
  n_empleados: number | null;
  utilidad_neta: number | null;
  anio: number | null;
  sector_match_type: string;
  sector_relevance: number;
}

/**
 * Enhanced sector search using the new PostgreSQL RPC function
 * Uses pg_trgm similarity scoring and CIIU code matching for better relevance
 * 
 * @param params - Search parameters including keywords and CIIU codes
 * @param supabaseClient - Optional Supabase client (uses server client if not provided)
 * @returns Companies with relevance scores and match types
 */
export async function searchCompaniesBySector(
  params: {
    sectorKeywords: string[];
    ciuuPrefixes?: string[];
    province?: string;
    minRevenue?: number;
    minEmployees?: number;
    maxResults?: number;
  },
  supabaseClient?: SupabaseClient
): Promise<{ companies: SectorSearchResult[]; totalCount: number }> {
  const supabase = supabaseClient ?? (await createClient());
  
  const { data, error } = await supabase.rpc('search_companies_by_sector', {
    p_sector_keywords: params.sectorKeywords,
    p_ciiu_prefixes: params.ciuuPrefixes || null,
    p_province_filter: params.province || null,
    p_min_revenue: params.minRevenue || null,
    p_min_employees: params.minEmployees || null,
    p_max_results: params.maxResults || 25,
  });

  if (error) {
    console.error('[searchCompaniesBySector] RPC error:', error);
    throw new Error(`Sector search failed: ${error.message}`);
  }

  return {
    companies: data || [],
    totalCount: data?.length || 0,
  };
}

/**
 * Semantic company search with fuzzy matching using pg_trgm
 * Best for finding companies by name when exact spelling is unknown
 * 
 * @param query - Search query (company name or description)
 * @param options - Optional filters and limits
 * @param supabaseClient - Optional Supabase client
 * @returns Companies ranked by similarity score
 */
export async function searchCompaniesSemanticRPC(
  query: string,
  options?: {
    sectorCodes?: string[];
    province?: string;
    minRevenue?: number;
    maxResults?: number;
  },
  supabaseClient?: SupabaseClient
): Promise<{ companies: Company[]; totalCount: number }> {
  const supabase = supabaseClient ?? (await createClient());
  
  const { data, error } = await supabase.rpc('search_companies_semantic', {
    search_query: query,
    sector_codes: options?.sectorCodes || null,
    province_filter: options?.province || null,
    min_revenue: options?.minRevenue || null,
    max_results: options?.maxResults || 20,
  });

  if (error) {
    console.error('[searchCompaniesSemanticRPC] RPC error:', error);
    // Fall back to regular search on error
    return { companies: [], totalCount: 0 };
  }

  // Convert RPC result to Company type (with additional relevance_score)
  const companies = (data || []).map((row: any) => ({
    ...row,
    // Map the RPC column names to Company interface
    actividad_principal: row.descripcion, // For compatibility
  })) as Company[];

  return {
    companies,
    totalCount: companies.length,
  };
}

// Define the structure of the search parameters for clarity and type safety.
interface SearchParams {
  page?: string;
  ruc?: string;
  nombre?: string;
  provincia?: string;
  anio?: string;
  nEmpleadosMin?: string;
  nEmpleadosMax?: string;
  ingresosVentasMin?: string;
  ingresosVentasMax?: string;
  activosMin?: string;
  activosMax?: string;
  patrimonioMin?: string;
  patrimonioMax?: string;
  impuestoRentaMin?: string;
  impuestoRentaMax?: string;
  utilidadAnImpMin?: string;
  utilidadAnImpMax?: string;
  utilidadNetaMin?: string;
  utilidadNetaMax?: string;
  nombreComercial?: string;
  // New optional sorting and gating flags (string-encoded for URL compatibility)
  sortBy?: 'completitud' | 'ingresos_ventas' | 'n_empleados' | 'utilidad_neta' | 'activos' | 'anio';
  sortDir?: 'asc' | 'desc';
  requireIngresos?: string;
  requireEmpleados?: string;
  // NEW: Sector/Industry filters
  sector?: string;
  sectorKeywords?: string[];
  sectorCIIU?: string[];
  sectorText?: string;
}

// Define the structure of the paginated response.
interface PaginatedResponse {
  companies: Company[];
  totalCount: number;
}

const ITEMS_PER_PAGE = 12;

/**
 * Fetches the total count of companies in the database.
 *
 * @returns A promise that resolves to the total company count.
 */
export async function fetchTotalCompanyCount(supabaseClient?: SupabaseClient): Promise<number> {
  const supabase = supabaseClient ?? (await createClient());

  const { count, error } = await supabase
    .from("companies")
    .select("*", { count: "estimated", head: true })
    .in("anio", [2024, 2023, 2022, 2021, 2020]); // Count only the most recent 5 fiscal years

  if (error) {
    console.error("Error fetching total company count:", error);
    throw new Error("Could not fetch total company count.");
  }

  return count || 0;
}

/**
 * Fetches companies from the database with server-side
 * filtering and pagination.
 *
 * @param searchParams - The search parameters from the URL.
 * @returns A promise that resolves to the paginated company
 * data.
 */
export async function fetchCompanies(
  params: SearchParams & { exportAll?: boolean; pageSize?: number },
  supabaseClient?: SupabaseClient
): Promise<PaginatedResponse> {
  const supabase = supabaseClient ?? (await createClient());

  const currentPage = parseInt(params.page || "1", 10);
  const pageSize = params.pageSize || ITEMS_PER_PAGE;
  const offset = (currentPage - 1) * pageSize;

  // Query companies table filtered by latest year (2024/2023)
  // This is fast with indexed year column
  let query = supabase
    .from("companies")
    .select("*", { count: "estimated" })
    .in("anio", [2024, 2023, 2022, 2021, 2020]); // Default to the most recent 5 fiscal years; user can filter by anio if needed

  // Apply filters based on search parameters.
  // These map directly to the user's input in the filter
  // form.

  // Text-based filters using 'ilike' for case-insensitive
  // partial matches.
  const ruc = sanitizeTextParam(params.ruc);
  if (ruc) {
    query = query.ilike("ruc", buildContainsPattern(ruc));
  }

  const nombre = sanitizeTextParam(params.nombre);
  if (nombre) {
    query = query.ilike("nombre", buildContainsPattern(nombre));
  }

  const nombreComercial = sanitizeTextParam(params.nombreComercial);
  if (nombreComercial) {
    query = query.ilike("nombre_comercial", buildContainsPattern(nombreComercial));
  }

  // Exact match filters.
  const provincia = sanitizeTextParam(params.provincia)?.toUpperCase();
  if (provincia) {
    query = query.ilike("provincia", buildPrefixPattern(provincia));
  }

  const anio = sanitizeTextParam(params.anio);
  if (anio) {
    const parsedAnio = parseInt(anio, 10);
    if (!Number.isNaN(parsedAnio)) {
      query = query.eq("anio", parsedAnio);
    }
  }

  // Range filters for numeric values (e.g., min/max number
  // of employees).
  if (params.nEmpleadosMin) {
    query = query.gte("n_empleados", parseInt(params.nEmpleadosMin, 10));
  }
  if (params.nEmpleadosMax) {
    query = query.lte("n_empleados", parseInt(params.nEmpleadosMax, 10));
  }
  if (params.ingresosVentasMin) {
    query = query.gte("ingresos_ventas", parseFloat(params.ingresosVentasMin));
  }
  if (params.ingresosVentasMax) {
    query = query.lte("ingresos_ventas", parseFloat(params.ingresosVentasMax));
  }
  if (params.activosMin) {
    query = query.gte("activos", parseFloat(params.activosMin));
  }
  if (params.activosMax) {
    query = query.lte("activos", parseFloat(params.activosMax));
  }
  if (params.patrimonioMin) {
    query = query.gte("patrimonio", parseFloat(params.patrimonioMin));
  }
  if (params.patrimonioMax) {
    query = query.lte("patrimonio", parseFloat(params.patrimonioMax));
  }
  if (params.impuestoRentaMin) {
    query = query.gte("impuesto_renta", parseFloat(params.impuestoRentaMin));
  }
  if (params.impuestoRentaMax) {
    query = query.lte("impuesto_renta", parseFloat(params.impuestoRentaMax));
  }
  if (params.utilidadAnImpMin) {
    query = query.gte("utilidad_an_imp", parseFloat(params.utilidadAnImpMin));
  }
  if (params.utilidadAnImpMax) {
    query = query.lte("utilidad_an_imp", parseFloat(params.utilidadAnImpMax));
  }
  if (params.utilidadNetaMin) {
    query = query.gte("utilidad_neta", parseFloat(params.utilidadNetaMin));
  }
  if (params.utilidadNetaMax) {
    query = query.lte("utilidad_neta", parseFloat(params.utilidadNetaMax));
  }

  // Gating flags: exclude rows missing key fields when requested
  const requireIngresos = sanitizeTextParam(params.requireIngresos);
  if (requireIngresos === 'true') {
    query = query.not('ingresos_ventas', 'is', null);
  }
  const requireEmpleados = sanitizeTextParam(params.requireEmpleados);
  if (requireEmpleados === 'true') {
    query = query.not('n_empleados', 'is', null);
  }

  // ============================================================================
  // NEW: SECTOR/INDUSTRY FILTERING
  // Uses multiple strategies: CIIU codes, descripcion (actividad_principal is empty in DB)
  // 
  // Database field coverage (from MCP query):
  // - ciiu: 1,378,335 records (91%)
  // - ciiu_n1: 1,378,335 records (91%) - single letter section code (A, C, G, etc.)
  // - descripcion: 1,378,335 records (91%) - activity description text
  // - segmento: 1,232,143 records (81%) - company size (GRANDE, MEDIANA, PEQUEÑA, MICROEMPRESA)
  // - actividad_principal: 0 records (EMPTY - do not use)
  // ============================================================================
  
  // Strategy 1: Filter by CIIU codes (most precise)
  // CIIU format in DB: "C1010.11" - section letter + 4 digits + optional decimal
  if (params.sectorCIIU && params.sectorCIIU.length > 0) {
    // Build OR conditions for CIIU prefixes
    const ciuuFilters: string[] = [];
    for (const ciuuPrefix of params.sectorCIIU) {
      // If single letter, match ciiu_n1 exactly (e.g., 'C' for all manufacturing)
      if (ciuuPrefix.length === 1) {
        ciuuFilters.push(`ciiu_n1.eq.${ciuuPrefix}`);
      } else {
        // For longer prefixes like 'C10', match ciiu starting with pattern
        ciuuFilters.push(`ciiu.ilike.${ciuuPrefix}%`);
      }
    }
    if (ciuuFilters.length > 0) {
      query = query.or(ciuuFilters.join(','));
    }
  }
  
  // Strategy 2: Filter by sector keywords in descripcion (the main text field)
  // NOTE: actividad_principal is EMPTY in the database, use descripcion instead
  if (params.sectorKeywords && params.sectorKeywords.length > 0) {
    // Build OR conditions for text search
    const keywordFilters: string[] = [];
    for (const keyword of params.sectorKeywords.slice(0, 5)) { // Limit to 5 keywords for performance
      // Search in descripcion (activity description - this is where the data is)
      keywordFilters.push(`descripcion.ilike.%${escapeForILike(keyword)}%`);
      // Also search in company name for sector-related keywords
      keywordFilters.push(`nombre.ilike.%${escapeForILike(keyword)}%`);
      keywordFilters.push(`nombre_comercial.ilike.%${escapeForILike(keyword)}%`);
    }
    if (keywordFilters.length > 0) {
      query = query.or(keywordFilters.join(','));
    }
  }
  
  // Strategy 3: Free-text sector search (fallback when no mapping found)
  const sectorText = sanitizeTextParam(params.sectorText);
  if (sectorText) {
    // Search across text fields that actually have data
    const textFilters = [
      `descripcion.ilike.%${escapeForILike(sectorText)}%`,
      `nombre.ilike.%${escapeForILike(sectorText)}%`,
      `nombre_comercial.ilike.%${escapeForILike(sectorText)}%`,
    ];
    query = query.or(textFilters.join(','));
  }

  // Apply sorting and pagination to the final query.
  // Prefer explicit sortBy/sortDir; otherwise default to relevance/completeness downstream
  let finalQuery = query;
  const sortByParam = sanitizeTextParam(params.sortBy as string | undefined);
  const sortBy = SORTABLE_FIELDS.find((field) => field === sortByParam) as SortableField | undefined;
  const sortDirParam = sanitizeTextParam(params.sortDir);
  const sortDir: 'asc' | 'desc' = sortDirParam === 'asc' ? 'asc' : 'desc';

  if (sortBy && sortBy !== 'completitud') {
    // Primary sort (skip for 'completitud' as it's handled client-side)
    finalQuery = finalQuery.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });
    // Secondary: prefer recent year
    if (sortBy !== 'anio') {
      finalQuery = finalQuery.order('anio', { ascending: false, nullsFirst: true });
    }
    // Stable tie-breaker
    finalQuery = finalQuery.order('id', { ascending: true });
  } else {
    // Default stable ordering if no explicit sort provided
    finalQuery = finalQuery
      .order("expediente", { ascending: true })
      .order("id", { ascending: true });
  }

  // Only apply pagination if not exporting all data
  if (!params.exportAll) {
    finalQuery = finalQuery.range(offset, offset + pageSize - 1);
  }

  const { data, error, count } = await finalQuery;

  if (error) {
    console.error("Error fetching companies:", error);
    throw new Error("Could not fetch companies.");
  }

  return {
    companies: data as Company[],
    totalCount: count || 0,
  };
}

export async function fetchCompanyHistory(ruc: string, supabaseClient?: SupabaseClient): Promise<Company[]> {
  const supabase = supabaseClient ?? (await createClient());

  console.log("Searching for RUC:", ruc);

  // Attempt to fetch the latest company snapshot including director info
  const { data: companyWithDirectors, error: directorsViewError } = await supabase
    .from("latest_companies_with_directors")
    .select("*")
    .eq("ruc", ruc)
    .single();

  let baseCompany = companyWithDirectors as Company | null;

  if (directorsViewError || !companyWithDirectors) {
    console.warn("latest_companies_with_directors view lookup failed, falling back:", directorsViewError);

    const { data: fallbackCompany, error: fallbackError } = await supabase
      .from("latest_companies_by_year")
      .select("*")
      .eq("ruc", ruc)
      .single();

    if (fallbackError || !fallbackCompany) {
      console.error("Company not found in fallback view:", fallbackError);
      return [];
    }

    baseCompany = fallbackCompany as Company;
  }

  if (baseCompany && !baseCompany.director_nombre && !baseCompany.director_representante && !baseCompany.director_telefono && !baseCompany.director_cargo) {
    const { data: directorData, error: directorError } = await supabase
      .from("directors")
      .select("nombre, telefono, representante, cargo")
      .eq("ruc", ruc)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!directorError && directorData) {
      baseCompany = {
        ...baseCompany,
        director_nombre: directorData.nombre ?? baseCompany.director_nombre ?? null,
        director_telefono: directorData.telefono ?? baseCompany.director_telefono ?? null,
        director_representante: directorData.representante ?? baseCompany.director_representante ?? null,
        director_cargo: directorData.cargo ?? baseCompany.director_cargo ?? null,
      };
    } else if (directorError) {
      console.warn("Director lookup failed:", directorError);
    }
  }

  console.log("Found company snapshot:", baseCompany);

  // Get all historical years for this company from companies table
  const { data: allYears, error: historyError } = await supabase
    .from("companies")
    .select("*")
    .eq("ruc", ruc)
    .order("anio", { ascending: false });

  if (historyError) {
    console.error("Error fetching company history:", historyError);
    return baseCompany ? [baseCompany] : [];
  }

  console.log("Found company history:", allYears);

  if (!allYears || allYears.length === 0) {
    console.log("No historical data found, returning latest snapshot only");
    return baseCompany ? [baseCompany] : [];
  }

  const enrichedHistory = allYears.map((yearData) => ({
    ...yearData,
    director_nombre: baseCompany?.director_nombre ?? null,
    director_telefono: baseCompany?.director_telefono ?? null,
    director_representante: baseCompany?.director_representante ?? null,
    director_cargo: baseCompany?.director_cargo ?? null,
  }));

  return enrichedHistory as Company[];
}
