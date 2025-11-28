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
