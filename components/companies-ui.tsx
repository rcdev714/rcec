'use client'

import { useState, useMemo, Fragment } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Company } from '@/types/company'
import { CompanyFilter } from '@/components/company-filter'
import { CompanyCard } from '@/components/company-card'
import { PaginationControls } from '@/components/pagination-controls'

interface CompaniesUIProps {
  companies: Company[]
}

export function CompaniesUI({ companies }: CompaniesUIProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(searchParams.toString())
    return {
      ruc: params.get('ruc') || '',
      provincia: params.get('provincia') || '',
      nEmpleadosMin: params.get('nEmpleadosMin') || '',
      nEmpleadosMax: params.get('nEmpleadosMax') || '',
      ingresosVentasMin: params.get('ingresosVentasMin') || '',
      ingresosVentasMax: params.get('ingresosVentasMax') || '',
      activosMin: params.get('activosMin') || '',
      activosMax: params.get('activosMax') || '',
      patrimonioMin: params.get('patrimonioMin') || '',
      patrimonioMax: params.get('patrimonioMax') || '',
      impuestoRentaMin: params.get('impuestoRentaMin') || '',
      impuestoRentaMax: params.get('impuestoRentaMax') || '',
      utilidadAnImpMin: params.get('utilidadAnImpMin') || '',
      utilidadAnImpMax: params.get('utilidadAnImpMax') || '',
      utilidadNetaMin: params.get('utilidadNetaMin') || '',
      utilidadNetaMax: params.get('utilidadNetaMax') || '',
      nombreComercial: params.get('nombreComercial') || '',
      nombre: params.get('nombre') || '',
      anio: params.get('anio') || '',
    }
  })

  const filteredCompanies = useMemo(() => {
    if (!companies) return []
    return companies.filter(company => {
      const nEmpleados = company.n_empleados ?? 0
      const ingresosVentas = company.ingresos_ventas ?? 0
      const activos = company.activos ?? 0
      const patrimonio = company.patrimonio ?? 0
      const impuestoRenta = company.impuesto_renta ?? 0
      const utilidadAnImp = company.utilidad_an_imp ?? 0
      const utilidadNeta = company.utilidad_neta ?? 0
      const anio = company.anio ?? 0

      return (
        (filters.ruc ? company.ruc?.includes(filters.ruc) : true) &&
        (filters.nombre ? company.nombre?.toLowerCase().includes(filters.nombre.toLowerCase()) : true) &&
        (filters.nombreComercial ? company.nombre_comercial?.toLowerCase().includes(filters.nombreComercial.toLowerCase()) : true) &&
        (filters.provincia ? company.provincia?.toLowerCase().includes(filters.provincia.toLowerCase()) : true) &&
        (filters.nEmpleadosMin ? nEmpleados >= parseInt(filters.nEmpleadosMin) : true) &&
        (filters.nEmpleadosMax ? nEmpleados <= parseInt(filters.nEmpleadosMax) : true) &&
        (filters.ingresosVentasMin ? ingresosVentas >= parseFloat(filters.ingresosVentasMin) : true) &&
        (filters.ingresosVentasMax ? ingresosVentas <= parseFloat(filters.ingresosVentasMax) : true) &&
        (filters.activosMin ? activos >= parseFloat(filters.activosMin) : true) &&
        (filters.activosMax ? activos <= parseFloat(filters.activosMax) : true) &&
        (filters.patrimonioMin ? patrimonio >= parseFloat(filters.patrimonioMin) : true) &&
        (filters.patrimonioMax ? patrimonio <= parseFloat(filters.patrimonioMax) : true) &&
        (filters.impuestoRentaMin ? impuestoRenta >= parseFloat(filters.impuestoRentaMin) : true) &&
        (filters.impuestoRentaMax ? impuestoRenta <= parseFloat(filters.impuestoRentaMax) : true) &&
        (filters.utilidadAnImpMin ? utilidadAnImp >= parseFloat(filters.utilidadAnImpMin) : true) &&
        (filters.utilidadAnImpMax ? utilidadAnImp <= parseFloat(filters.utilidadAnImpMax) : true) &&
        (filters.utilidadNetaMin ? utilidadNeta >= parseFloat(filters.utilidadNetaMin) : true) &&
        (filters.utilidadNetaMax ? utilidadNeta <= parseFloat(filters.utilidadNetaMax) : true) &&
        (filters.anio ? anio === parseInt(filters.anio) : true)
      )
    })
  }, [companies, filters])

  const currentPage = Number(searchParams.get('page')) || 1
  const itemsPerPage = 12
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage)
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleFiltersChange = (newFilters: { [key: string]: string | string[] | undefined }) => {
    setFilters(newFilters as typeof filters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        params.set(key, value);
      }
    });
    params.set('page', '1');
    router.push(`/companies?${params.toString()}`, { scroll: false });
  };

  return (
    <Fragment>
      <div className="flex flex-1 pt-4 max-w-7xl mx-auto">
        <div className="w-full md:w-1/4 lg:w-1/5 mr-8">
          <div className="mb-8">
            <CompanyFilter
              initialFilters={filters}
              onApplyFilters={handleFiltersChange}
              companyCount={filteredCompanies.length}
            />
          </div>
        </div>
        <div className="flex-1">
          {paginatedCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedCompanies.map((company) => (
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
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </Fragment>
  )
}
