'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Company } from '@/types/company';
import { CompanyFilter } from '@/components/company-filter';
import { CompanyCard } from '@/components/company-card';
import { PaginationControls } from '@/components/pagination-controls';


interface CompaniesUIProps {
  companies: Company[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function CompaniesUI({ companies, totalCount, page, totalPages }: CompaniesUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // When filters are applied, this function updates the URL search parameters.
  // This triggers a server-side re-render with the new filtered data.
  const handleFiltersChange = (newFilters: { [key: string]: string | string[] | undefined }) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        params.set(key, value);
      }
    });
    // Reset to the first page whenever filters change.
    params.set('page', '1');
    router.push(`/companies?${params.toString()}`, { scroll: false });
  };

  // Initialize filters state from the current URL search parameters.
  const initialFilters = {
    ruc: searchParams.get('ruc') || '',
    provincia: searchParams.get('provincia') || '',
    nEmpleadosMin: searchParams.get('nEmpleadosMin') || '',
    nEmpleadosMax: searchParams.get('nEmpleadosMax') || '',
    ingresosVentasMin: searchParams.get('ingresosVentasMin') || '',
    ingresosVentasMax: searchParams.get('ingresosVentasMax') || '',
    activosMin: searchParams.get('activosMin') || '',
    activosMax: searchParams.get('activosMax') || '',
    patrimonioMin: searchParams.get('patrimonioMin') || '',
    patrimonioMax: searchParams.get('patrimonioMax') || '',
    impuestoRentaMin: searchParams.get('impuestoRentaMin') || '',
    impuestoRentaMax: searchParams.get('impuestoRentaMax') || '',
    utilidadAnImpMin: searchParams.get('utilidadAnImpMin') || '',
    utilidadAnImpMax: searchParams.get('utilidadAnImpMax') || '',
    utilidadNetaMin: searchParams.get('utilidadNetaMin') || '',
    utilidadNetaMax: searchParams.get('utilidadNetaMax') || '',
    nombreComercial: searchParams.get('nombreComercial') || '',
    nombre: searchParams.get('nombre') || '',
    anio: searchParams.get('anio') || '',
    sortBy: searchParams.get('sortBy') || '',
    sortDir: searchParams.get('sortDir') || '',
    requireIngresos: searchParams.get('requireIngresos') || '',
    requireEmpleados: searchParams.get('requireEmpleados') || '',
  };

  return (
    <div className="flex gap-4">
      {/* Sidebar with filters */}
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-8">
          <CompanyFilter
            initialFilters={initialFilters}
            onApplyFilters={handleFiltersChange}
            companyCount={totalCount}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {companies.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center pt-8">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              No se encontraron empresas que coincidan con los criterios de búsqueda.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Prueba ajustando los filtros para obtener más resultados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
