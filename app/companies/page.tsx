import { CompaniesUI } from "@/components/companies-ui";
import { fetchCompanies } from "@/lib/data/companies";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Define the expected search parameters for the page.
interface CompaniesPageProps {
  searchParams: Promise<{
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
    utilidadAnImpMin?: string;
    utilidadAnImpMax?: string;
    utilidadNetaMin?: string;
    utilidadNetaMax?: string;
    nombreComercial?: string;
  }>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { page: pageStr, ruc, nombre, provincia, anio, nEmpleadosMin, nEmpleadosMax, ingresosVentasMin, ingresosVentasMax, activosMin, activosMax, patrimonioMin, patrimonioMax, utilidadAnImpMin, utilidadAnImpMax, utilidadNetaMin, utilidadNetaMax, nombreComercial } = await searchParams;
  const { sortBy, sortDir, requireIngresos, requireEmpleados } = await searchParams;

  const page = parseInt(pageStr || "1", 10);

  // Fetch the company data on the server based on the current URL search parameters.
  const { companies, totalCount } = await fetchCompanies({
    page: pageStr,
    ruc,
    nombre,
    provincia,
    anio,
    nEmpleadosMin,
    nEmpleadosMax,
    ingresosVentasMin,
    ingresosVentasMax,
    activosMin,
    activosMax,
    patrimonioMin,
    patrimonioMax,
    utilidadAnImpMin,
    utilidadAnImpMax,
    utilidadNetaMin,
    utilidadNetaMax,
    nombreComercial,
    sortBy,
    sortDir,
    requireIngresos,
    requireEmpleados,
  });
  const totalPages = Math.ceil(totalCount / 12);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-full mx-0 px-6 py-4">
        {/* Header with logo and auth */}
        <div className="mb-4 px-6">
          <h1 className="text-2xl font-semibold mb-2">Empresas</h1>
          <p className="text-gray-600 text-sm">
            Explora más de 300,000 empresas ecuatorianas con información financiera, contactos y datos actualizados. Usa filtros avanzados para encontrar tus clientes ideales.
          </p>
        </div>
        
        
        
        <CompaniesUI
          companies={companies}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";


 