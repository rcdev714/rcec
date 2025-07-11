'use client';

import { Fragment } from 'react';
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
  };

  return (
    <Fragment>
      <div className="flex flex-1 pt-4 max-w-7xl mx-auto">
        <div className="w-full md:w-1/4 lg:w-1/5 mr-8">
          <div className="mb-8">
            <CompanyFilter
              initialFilters={initialFilters}
              onApplyFilters={handleFiltersChange}
              companyCount={totalCount}
            />
          </div>
        </div>
        <div className="flex-1">
          {companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">No companies found matching your criteria.</p>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex justify-center">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
        />
      </div>
    </Fragment>
  );
}
