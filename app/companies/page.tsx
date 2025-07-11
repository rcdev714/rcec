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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Empresas
          </h1>
          <p className="text-muted-foreground mt-2">
            Explora y filtra empresas ecuatorianas por diversos criterios financieros y geográficos.
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


 