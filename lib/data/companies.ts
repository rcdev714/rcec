import { createClient } from "@/lib/supabase/server";
import { Company } from "@/types/company";

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
}

// Define the structure of the paginated response.
interface PaginatedResponse {
  companies: Company[];
  totalCount: number;
}

interface FinancialYearData {
  anio: number;
  ingresos_ventas_netas: number;
  utilidad_integral_neta: number;
  impuesto_renta: number;
  utilidad_antes_impuestos: number;
}

const ITEMS_PER_PAGE = 12;

/**
 * Fetches the total count of companies in the database.
 *
 * @returns A promise that resolves to the total company count.
 */
export async function fetchTotalCompanyCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("latest_companies")
    .select("*", { count: "estimated", head: true });

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
export async function fetchCompanies(params: SearchParams & { exportAll?: boolean; pageSize?: number }): Promise<PaginatedResponse> {
  const supabase = await createClient();

  const currentPage = parseInt(params.page || "1", 10);
  const pageSize = params.pageSize || ITEMS_PER_PAGE;
  const offset = (currentPage - 1) * pageSize;

  // Start building the query to the "latest_companies" view.
  // We select all columns and request the total count for
  // pagination.
  let query = supabase
    .from("latest_companies_with_directors")
    .select("*", { count: "estimated" });

  // Apply filters based on search parameters.
  // These map directly to the user's input in the filter
  // form.

  // Text-based filters using 'ilike' for case-insensitive
  // partial matches.
  if (params.ruc) {
    query = query.ilike("ruc", `%${params.ruc}%`);
  }
  if (params.nombre) {
    query = query.ilike("nombre", `%${params.nombre}%`);
  }
  if (params.nombreComercial) {
    query = query.ilike("nombre_comercial", `%${params.nombreComercial}%`);
  }

  // Exact match filters.
  if (params.provincia) {
    query = query.eq("provincia", params.provincia.toUpperCase());
  }
  if (params.anio) {
    query = query.eq("anio", parseInt(params.anio, 10));
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

  // Apply sorting and pagination to the final query.
  // This order must match our database indexes for optimal
  // performance.
  let finalQuery = query
    .order("expediente", { ascending: true })
    .order("id", { ascending: true });

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

export async function fetchCompanyHistory(ruc: string): Promise<Company[]> {
  const supabase = await createClient();

  console.log("Searching for RUC:", ruc);

  // First, get the company basic info from latest_companies
  const { data: companyData, error: companyError } = await supabase
    .from("latest_companies_with_directors")
    .select("*")
    .eq("ruc", ruc)
    .single();

  if (companyError || !companyData) {
    console.error("Company not found:", companyError);
    return [];
  }

  console.log("Found company:", companyData);

  // Now get historical financial data from estado_de_resultados table
  const { data: financialData, error: financialError } = await supabase
    .from("estado_de_resultados")
    .select("*")
    .eq("company_id", companyData.id)
    .order("anio", { ascending: false });

  if (financialError) {
    console.error("Error fetching financial history:", financialError);
    // Fallback to just the company data if financial data fails
    return [companyData as Company];
  }

  console.log("Found financial data:", financialData);

  // If no financial history found, return just the company data
  if (!financialData || financialData.length === 0) {
    console.log("No financial history found, returning company data only");
    return [companyData as Company];
  }

  // Combine company data with each year's financial data
  const combinedHistory = financialData.map((yearData: FinancialYearData) => ({
    ...companyData,
    anio: yearData.anio,
    ingresos_ventas: yearData.ingresos_ventas_netas,
    utilidad_neta: yearData.utilidad_integral_neta,
    impuesto_renta: yearData.impuesto_renta,
    utilidad_an_imp: yearData.utilidad_antes_impuestos,
    // Keep other company fields from latest_companies
  }));

  console.log("Combined history:", combinedHistory);
  return combinedHistory as Company[];
}
