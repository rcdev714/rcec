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
  });
  const totalPages = Math.ceil(totalCount / 12);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-2 py-4">
        {/* Header with logo and auth */}
        <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold px-6">Empresas</h1>
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


 