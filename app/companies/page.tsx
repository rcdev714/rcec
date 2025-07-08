// Adding a comment to trigger linter re-evaluation
import { createClient } from "@/lib/supabase/server";
import { CompanyFilter } from "@/components/company-filter";
import { PaginationControls } from "@/components/pagination-controls";
import { Card } from "@/components/ui/card";
import { Company } from "@/types/company";

export default async function CompaniesPage({
  searchParams,
}: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const supabase = await createClient();

  const resolvedSearchParams = await searchParams;

  const filters = {
    ruc: (resolvedSearchParams.ruc as string) || '',
    provincia: (resolvedSearchParams.provincia as string) || '',
    nEmpleadosMin: (resolvedSearchParams.nEmpleadosMin as string) || '',
    nEmpleadosMax: (resolvedSearchParams.nEmpleadosMax as string) || '',
    ingresosVentasMin: (resolvedSearchParams.ingresosVentasMin as string) || '',
    ingresosVentasMax: (resolvedSearchParams.ingresosVentasMax as string) || '',
    activosMin: (resolvedSearchParams.activosMin as string) || '',
    activosMax: (resolvedSearchParams.activosMax as string) || '',
    patrimonioMin: (resolvedSearchParams.patrimonioMin as string) || '',
    patrimonioMax: (resolvedSearchParams.patrimonioMax as string) || '',
    impuestoRentaMin: (resolvedSearchParams.impuestoRentaMin as string) || '',
    impuestoRentaMax: (resolvedSearchParams.impuestoRentaMax as string) || '',
    utilidadAnImpMin: (resolvedSearchParams.utilidadAnImpMin as string) || '',
    utilidadAnImpMax: (resolvedSearchParams.utilidadAnImpMax as string) || '',
    utilidadNetaMin: (resolvedSearchParams.utilidadNetaMin as string) || '',
    utilidadNetaMax: (resolvedSearchParams.utilidadNetaMax as string) || '',
    nombreComercial: (resolvedSearchParams.nombreComercial as string) || '',
    nombre: (resolvedSearchParams.nombre as string) || '',
  };

  const currentPage = Number(resolvedSearchParams.page) || 1;
  const itemsPerPage = 10;
  const offset = (currentPage - 1) * itemsPerPage;

  let query = supabase.from("companies").select(`
    id,
    expediente,
    ruc,
    nombre,
    nombre_comercial,
    tipo,
    pro_codigo,
    provincia,
    canton,
    ciudad,
    actividad_principal,
    estado_empresa,
    tipo_empresa,
    segmento_empresa,
    fecha_constitucion,
    anio,
    posicion_general,
    cia_imvalores,
    ingresos_ventas,
    activos,
    patrimonio,
    utilidad_an_imp,
    impuesto_renta,
    n_empleados,
    ingresos_totales,
    utilidad_ejercicio,
    utilidad_neta,
    cod_segmento,
    ciiu_n1,
    ciiu_n6,
    liquidez_corriente,
    prueba_acida,
    end_activo,
    end_patrimonial,
    end_activo_fijo,
    end_corto_plazo,
    end_largo_plazo,
    cobertura_interes,
    apalancamiento,
    apalancamiento_financiero,
    end_patrimonial_ct,
    end_patrimonial_nct,
    apalancamiento_c_l_plazo,
    rot_cartera,
    rot_activo_fijo,
    rot_ventas,
    per_med_cobranza,
    per_med_pago,
    impac_gasto_a_v,
    impac_carga_finan,
    rent_neta_activo,
    margen_bruto,
    margen_operacional,
    rent_neta_ventas,
    rent_ope_patrimonio,
    rent_ope_activo,
    roe,
    roa,
    fortaleza_patrimonial,
    gastos_financieros,
    gastos_admin_ventas,
    depreciaciones,
    amortizaciones,
    costos_ventas_prod,
    deuda_total,
    deuda_total_c_plazo,
    total_gastos,
    ciiu,
    descripcion,
    id_segmento,
    segmento
  `, { count: 'exact' });

  let countQuery = supabase.from("companies").select('*', { count: 'exact', head: true });

  if (filters.ruc) {
    query = query.eq("ruc", filters.ruc);
    countQuery = countQuery.eq("ruc", filters.ruc);
  }
  if (filters.nombreComercial) {
    query = query.ilike("nombre_comercial", `%${filters.nombreComercial}%`);
    countQuery = countQuery.ilike("nombre_comercial", `%${filters.nombreComercial}%`);
  }
  if (filters.provincia) {
    query = query.ilike("provincia", `%${filters.provincia}%`);
    countQuery = countQuery.ilike("provincia", `%${filters.provincia}%`);
  }

  if (filters.nombre) {
    query = query.ilike("nombre", `%${filters.nombre}%`);
    countQuery = countQuery.ilike("nombre", `%${filters.nombre}%`);
  }

  // Number of Employees Filter
  if (filters.nEmpleadosMin) {
    query = query.gte("n_empleados", parseInt(filters.nEmpleadosMin));
    countQuery = countQuery.gte("n_empleados", parseInt(filters.nEmpleadosMin));
  }
  if (filters.nEmpleadosMax) {
    query = query.lte("n_empleados", parseInt(filters.nEmpleadosMax));
    countQuery = countQuery.lte("n_empleados", parseInt(filters.nEmpleadosMax));
  }

  // Financial Filters from related tables
  // These filters need to be applied with caution as they are on related tables
  // For simplicity, we are assuming direct filtering for now.
  // In a real application, you might need more complex JOINs or subqueries.

  // Ingresos Ventas
  if (resolvedSearchParams.ingresosVentasMin) {
    query = query.gte("ingresos_ventas", parseFloat(resolvedSearchParams.ingresosVentasMin as string));
    countQuery = countQuery.gte("ingresos_ventas", parseFloat(resolvedSearchParams.ingresosVentasMin as string));
  }
  if (resolvedSearchParams.ingresosVentasMax) {
    query = query.lte("ingresos_ventas", parseFloat(resolvedSearchParams.ingresosVentasMax as string));
    countQuery = countQuery.lte("ingresos_ventas", parseFloat(resolvedSearchParams.ingresosVentasMax as string));
  }

  // Activos
  if (resolvedSearchParams.activosMin) {
    query = query.gte("activos", parseFloat(resolvedSearchParams.activosMin as string));
    countQuery = countQuery.gte("activos", parseFloat(resolvedSearchParams.activosMin as string));
  }
  if (resolvedSearchParams.activosMax) {
    query = query.lte("activos", parseFloat(resolvedSearchParams.activosMax as string));
    countQuery = countQuery.lte("activos", parseFloat(resolvedSearchParams.activosMax as string));
  }

  // Patrimonio
  if (resolvedSearchParams.patrimonioMin) {
    query = query.gte("patrimonio", parseFloat(resolvedSearchParams.patrimonioMin as string));
    countQuery = countQuery.gte("patrimonio", parseFloat(resolvedSearchParams.patrimonioMin as string));
  }
  if (resolvedSearchParams.patrimonioMax) {
    query = query.lte("patrimonio", parseFloat(resolvedSearchParams.patrimonioMax as string));
    countQuery = countQuery.lte("patrimonio", parseFloat(resolvedSearchParams.patrimonioMax as string));
  }

  // Impuesto Renta
  if (resolvedSearchParams.impuestoRentaMin) {
    query = query.gte("impuesto_renta", parseFloat(resolvedSearchParams.impuestoRentaMin as string));
    countQuery = countQuery.gte("impuesto_renta", parseFloat(resolvedSearchParams.impuestoRentaMin as string));
  }
  if (resolvedSearchParams.impuestoRentaMax) {
    query = query.lte("impuesto_renta", parseFloat(resolvedSearchParams.impuestoRentaMax as string));
    countQuery = countQuery.lte("impuesto_renta", parseFloat(resolvedSearchParams.impuestoRentaMax as string));
  }

  // Utilidad An Imp
  if (resolvedSearchParams.utilidadAnImpMin) {
    query = query.gte("utilidad_an_imp", parseFloat(resolvedSearchParams.utilidadAnImpMin as string));
    countQuery = countQuery.gte("utilidad_an_imp", parseFloat(resolvedSearchParams.utilidadAnImpMin as string));
  }
  if (resolvedSearchParams.utilidadAnImpMax) {
    query = query.lte("utilidad_an_imp", parseFloat(resolvedSearchParams.utilidadAnImpMax as string));
    countQuery = countQuery.lte("utilidad_an_imp", parseFloat(resolvedSearchParams.utilidadAnImpMax as string));
  }

  // Utilidad Neta
  if (resolvedSearchParams.utilidadNetaMin) {
    query = query.gte("utilidad_neta", parseFloat(resolvedSearchParams.utilidadNetaMin as string));
    countQuery = countQuery.gte("utilidad_neta", parseFloat(resolvedSearchParams.utilidadNetaMin as string));
  }
  if (resolvedSearchParams.utilidadNetaMax) {
    query = query.lte("utilidad_neta", parseFloat(resolvedSearchParams.utilidadNetaMax as string));
    countQuery = countQuery.lte("utilidad_neta", parseFloat(resolvedSearchParams.utilidadNetaMax as string));
  }

  const { data: companies, error } = await query
    .range(offset, offset + itemsPerPage - 1)
    .order('nombre_comercial', { ascending: true });

  const { count, error: countError } = await countQuery;

  if (error || countError) {
    console.error("Error fetching companies or count:", error || countError);
    return <div>Error loading companies.</div>;
  }

  const totalPages = count ? Math.ceil(count / itemsPerPage) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">UNIBROKERS</h1>
      </div>
      <div className="flex flex-1 pt-4 max-w-7xl mx-auto">
        {/* Left column for filters */}
        <div className="w-full md:w-1/2 lg:w-1/3 mr-8">
          <div className="mb-8">
            <CompanyFilter initialFilters={filters} />
          </div>
        </div>

        {/* Right column for company cards and pagination */}
        <div className="flex-1">
          {companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company: Company) => (
                <Card key={company.id} className="dark:bg-gray-800 dark:border-gray-700 p-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {company.nombre}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">Activos: {company.activos}</p>
                  <p className="text-gray-600 dark:text-gray-400">Patrimonio: {company.patrimonio}</p>
                  <p className="text-gray-600 dark:text-gray-400">Utilidad Neta: {company.utilidad_neta}</p>
                  <p className="text-gray-600 dark:text-gray-400">Total Gastos: {company.total_gastos}</p>
                  <p className="text-gray-600 dark:text-gray-400">RUC: {company.ruc}</p>
                  <p className="text-gray-600 dark:text-gray-400">Provincia: {company.provincia}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Número de Empleados: {company.n_empleados}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">No companies found matching your criteria.</p>
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
} 