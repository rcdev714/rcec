'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Company } from '@/types/company';
import { CompanyFilter } from '@/components/company-filter';
import { PaginationControls } from '@/components/pagination-controls';
import Link from 'next/link';
import { Building2, MapPin, DollarSign, TrendingUp, Users, Loader2 } from 'lucide-react';

interface CompaniesUIProps {
  companies: Company[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function CompaniesUI({ companies, totalCount, page, totalPages }: CompaniesUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFetching, setIsFetching] = useState(false);

  // When filters are applied, this function updates the URL search parameters.
  // This triggers a server-side re-render with the new filtered data.
  const handleFiltersChange = (newFilters: { [key: string]: string | string[] | undefined }) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value
          .filter((entry) => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => Boolean(entry && entry.length))
          .forEach((entry) => {
            params.append(key, entry);
          });
        return;
      }

      if (value && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length) {
          params.set(key, trimmed);
        }
      }
    });
    // Reset to the first page whenever filters change.
    params.set('page', '1');
    setIsFetching(true);
    router.push(`/companies?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (isFetching) {
      setIsFetching(false);
    }
  }, [companies, totalCount, page, isFetching]);

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

  const formatCompactCurrency = (value: number | null | undefined) => {
    if (!value && value !== 0) return '—';
    const num = value;
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  const formatNumber = (value: number | null | undefined) => {
    if (!value && value !== 0) return '—';
    return value.toLocaleString('es-ES');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '—';
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
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
      <div className="flex-1 min-w-0 relative">
        {companies.length > 0 ? (
          <div className="space-y-4">
            {/* Results summary */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-gray-500 tracking-wide uppercase">
                <span className="text-indigo-600 font-semibold">{totalCount.toLocaleString()}</span> {totalCount === 1 ? 'empresa' : 'empresas'} encontradas
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden shadow-lg shadow-gray-900/5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 via-gray-50/50 to-gray-50 border-b border-gray-200/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Empresa
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Ubicación
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Ingresos
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Activos
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Patrimonio
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Empleados
                      </th>
                      <th className="px-6 py-4 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                        Año
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/40 divide-y divide-gray-100/50">
                    {companies.map((company) => {
                      const currentParams = searchParams.toString();
                      const returnUrl = currentParams ? `/companies?${currentParams}` : '/companies';
                      const companyName = company.nombre_comercial || company.nombre || 'N/A';
                      const initials = getInitials(companyName);
                      const profileUrl = returnUrl 
                        ? `/companies/${company.ruc}?returnUrl=${encodeURIComponent(returnUrl)}` 
                        : `/companies/${company.ruc}`;

                      return (
                        <tr
                          key={company.id}
                          className="hover:bg-gradient-to-r hover:from-indigo-50/30 hover:via-white/50 hover:to-white/50 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-indigo-400/50 group"
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-white border border-gray-300 flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/10 group-hover:shadow-black/20 transition-shadow">
                                  <span className="text-gray-700 font-normal text-xs">{initials}</span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-normal text-gray-900 truncate max-w-[200px] group-hover:text-indigo-700 transition-colors" title={companyName}>
                                  {companyName}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-mono tracking-wider">
                                    RUC: {company.ruc || '—'}
                                  </span>
                                  <Link href={profileUrl}>
                                    <button className="text-[10px] text-indigo-600 hover:text-white font-normal px-2 py-0.5 border border-indigo-300/60 rounded-md hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-indigo-500/20 ml-2">
                                      Ver
                                    </button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-gray-700 font-normal">
                              {company.provincia && (
                                <>
                                  <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span>{company.provincia}</span>
                                </>
                              )}
                              {!company.provincia && <span className="text-gray-400">—</span>}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <DollarSign className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-normal text-gray-900 font-mono">
                                {formatCompactCurrency(company.ingresos_ventas)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-normal text-gray-900 font-mono">
                                {formatCompactCurrency(company.activos)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <TrendingUp className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-normal text-gray-900 font-mono">
                                {formatCompactCurrency(company.patrimonio)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Users className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs font-normal text-gray-900 font-mono">
                                {formatNumber(company.n_empleados)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <span className="text-xs font-normal text-gray-600 bg-gray-100/60 px-2 py-1 rounded-md font-mono">
                              {company.anio || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center pt-4">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onNavigateStart={() => setIsFetching(true)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-12 shadow-lg shadow-gray-900/5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                No se encontraron empresas
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Prueba ajustando los filtros para obtener más resultados.
              </p>
            </div>
          </div>
        )}
        {isFetching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/60 pointer-events-none">
            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
            <p className="mt-2 text-xs text-gray-600">Cargando resultados...</p>
          </div>
        )}
      </div>
    </div>
  );
}
