import { CompaniesUI } from "@/components/companies-ui";
import { fetchCompanies } from "@/lib/data/companies";

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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">
          UNIBROKERS
        </h1>
      </div>
      <CompaniesUI
        companies={companies}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";


 