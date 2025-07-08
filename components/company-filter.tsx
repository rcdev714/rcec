'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface CompanyFilterProps {
  initialFilters: { [key: string]: string | string[] | undefined }
}

export function CompanyFilter({ initialFilters }: CompanyFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState({
    ruc: (initialFilters.ruc as string) || '',
    provincia: (initialFilters.provincia as string) || '',
    nEmpleadosMin: (initialFilters.nEmpleadosMin as string) || '',
    nEmpleadosMax: (initialFilters.nEmpleadosMax as string) || '',
    ingresosVentasMin: (initialFilters.ingresosVentasMin as string) || '',
    ingresosVentasMax: (initialFilters.ingresosVentasMax as string) || '',
    activosMin: (initialFilters.activosMin as string) || '',
    activosMax: (initialFilters.activosMax as string) || '',
    patrimonioMin: (initialFilters.patrimonioMin as string) || '',
    patrimonioMax: (initialFilters.patrimonioMax as string) || '',
    impuestoRentaMin: (initialFilters.impuestoRentaMin as string) || '',
    impuestoRentaMax: (initialFilters.impuestoRentaMax as string) || '',
    utilidadAnImpMin: (initialFilters.utilidadAnImpMin as string) || '',
    utilidadAnImpMax: (initialFilters.utilidadAnImpMax as string) || '',
    utilidadNetaMin: (initialFilters.utilidadNetaMin as string) || '',
    utilidadNetaMax: (initialFilters.utilidadNetaMax as string) || '',
    nombreComercial: (initialFilters.nombreComercial as string) || '',
    nombre: (initialFilters.nombre as string) || '',
  })

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // RUC
    if (filters.ruc) {
      params.set('ruc', filters.ruc);
    } else {
      params.delete('ruc');
    }

    // Nombre Comercial
    if (filters.nombreComercial) {
      params.set('nombreComercial', filters.nombreComercial);
    } else {
      params.delete('nombreComercial');
    }

    // Provincia
    if (filters.provincia) {
      params.set('provincia', filters.provincia);
    } else {
      params.delete('provincia');
    }

    // N Empleados
    if (filters.nEmpleadosMin) {
      params.set('nEmpleadosMin', filters.nEmpleadosMin);
    } else {
      params.delete('nEmpleadosMin');
    }
    if (filters.nEmpleadosMax) {
      params.set('nEmpleadosMax', filters.nEmpleadosMax);
    } else {
      params.delete('nEmpleadosMax');
    }

    // Ingresos Ventas
    if (filters.ingresosVentasMin) {
      params.set('ingresosVentasMin', filters.ingresosVentasMin);
    } else {
      params.delete('ingresosVentasMin');
    }
    if (filters.ingresosVentasMax) {
      params.set('ingresosVentasMax', filters.ingresosVentasMax);
    } else {
      params.delete('ingresosVentasMax');
    }

    // Activos
    if (filters.activosMin) {
      params.set('activosMin', filters.activosMin);
    } else {
      params.delete('activosMin');
    }
    if (filters.activosMax) {
      params.set('activosMax', filters.activosMax);
    } else {
      params.delete('activosMax');
    }

    // Patrimonio
    if (filters.patrimonioMin) {
      params.set('patrimonioMin', filters.patrimonioMin);
    } else {
      params.delete('patrimonioMin');
    }
    if (filters.patrimonioMax) {
      params.set('patrimonioMax', filters.patrimonioMax);
    } else {
      params.delete('patrimonioMax');
    }

    // Impuesto Renta
    if (filters.impuestoRentaMin) {
      params.set('impuestoRentaMin', filters.impuestoRentaMin);
    } else {
      params.delete('impuestoRentaMin');
    }
    if (filters.impuestoRentaMax) {
      params.set('impuestoRentaMax', filters.impuestoRentaMax);
    } else {
      params.delete('impuestoRentaMax');
    }

    // Utilidad An Imp
    if (filters.utilidadAnImpMin) {
      params.set('utilidadAnImpMin', filters.utilidadAnImpMin);
    } else {
      params.delete('utilidadAnImpMin');
    }
    if (filters.utilidadAnImpMax) {
      params.set('utilidadAnImpMax', filters.utilidadAnImpMax);
    } else {
      params.delete('utilidadAnImpMax');
    }

    // Utilidad Neta
    if (filters.utilidadNetaMin) {
      params.set('utilidadNetaMin', filters.utilidadNetaMin);
    } else {
      params.delete('utilidadNetaMin');
    }
    if (filters.utilidadNetaMax) {
      params.set('utilidadNetaMax', filters.utilidadNetaMax);
    } else {
      params.delete('utilidadNetaMax');
    }

    // Nombre
    if (filters.nombre) {
      params.set('nombre', filters.nombre);
    } else {
      params.delete('nombre');
    }

    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    setFilters({
      ruc: '',
      provincia: '',
      nEmpleadosMin: '',
      nEmpleadosMax: '',
      ingresosVentasMin: '',
      ingresosVentasMax: '',
      activosMin: '',
      activosMax: '',
      patrimonioMin: '',
      patrimonioMax: '',
      impuestoRentaMin: '',
      impuestoRentaMax: '',
      utilidadAnImpMin: '',
      utilidadAnImpMax: '',
      utilidadNetaMin: '',
      utilidadNetaMax: '',
      nombreComercial: '',
      nombre: '',
    })
    router.push('/companies') // Navigate to the base URL to clear all filters
  }

  useEffect(() => {
    setFilters({
      ruc: (searchParams.get('ruc') as string) || '',
      provincia: (searchParams.get('provincia') as string) || '',
      nEmpleadosMin: (searchParams.get('nEmpleadosMin') as string) || '',
      nEmpleadosMax: (searchParams.get('nEmpleadosMax') as string) || '',
      ingresosVentasMin: (searchParams.get('ingresosVentasMin') as string) || '',
      ingresosVentasMax: (searchParams.get('ingresosVentasMax') as string) || '',
      activosMin: (searchParams.get('activosMin') as string) || '',
      activosMax: (searchParams.get('activosMax') as string) || '',
      patrimonioMin: (searchParams.get('patrimonioMin') as string) || '',
      patrimonioMax: (searchParams.get('patrimonioMax') as string) || '',
      impuestoRentaMin: (searchParams.get('impuestoRentaMin') as string) || '',
      impuestoRentaMax: (searchParams.get('impuestoRentaMax') as string) || '',
      utilidadAnImpMin: (searchParams.get('utilidadAnImpMin') as string) || '',
      utilidadAnImpMax: (searchParams.get('utilidadAnImpMax') as string) || '',
      utilidadNetaMin: (searchParams.get('utilidadNetaMin') as string) || '',
      utilidadNetaMax: (searchParams.get('utilidadNetaMax') as string) || '',
      nombreComercial: (searchParams.get('nombreComercial') as string) || '',
      nombre: (searchParams.get('nombre') as string) || '',
    })
  }, [searchParams])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <Label htmlFor="ruc" className="text-gray-700 dark:text-gray-300">RUC</Label>
          <Input
            type="text"
            id="ruc"
            name="ruc"
            value={filters.ruc}
            onChange={handleFilterChange}
            placeholder="RUC"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="nombre" className="text-gray-700 dark:text-gray-300">Nombre</Label>
          <Input
            type="text"
            id="nombre"
            name="nombre"
            value={filters.nombre}
            onChange={handleFilterChange}
            placeholder="Nombre"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>

        <div>
          <Label htmlFor="nombreComercial" className="text-gray-700 dark:text-gray-300">Nombre Comercial</Label>
          <Input
            type="text"
            id="nombreComercial"
            name="nombreComercial"
            value={filters.nombreComercial}
            onChange={handleFilterChange}
            placeholder="Nombre Comercial"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <Label htmlFor="provincia" className="text-gray-700 dark:text-gray-300">Provincia</Label>
          <Input
            type="text"
            id="provincia"
            name="provincia"
            value={filters.provincia}
            onChange={handleFilterChange}
            placeholder="Provincia"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="nEmpleadosMin" className="text-gray-700 dark:text-gray-300">Min. Empleados</Label>
          <Input
            type="number"
            id="nEmpleadosMin"
            name="nEmpleadosMin"
            value={filters.nEmpleadosMin}
            onChange={handleFilterChange}
            placeholder="Min. Empleados"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="nEmpleadosMax" className="text-gray-700 dark:text-gray-300">Max. Empleados</Label>
          <Input
            type="number"
            id="nEmpleadosMax"
            name="nEmpleadosMax"
            value={filters.nEmpleadosMax}
            onChange={handleFilterChange}
            placeholder="Max. Empleados"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="ingresosVentasMin" className="text-gray-700 dark:text-gray-300">Min. Ingresos Ventas</Label>
          <Input
            type="number"
            id="ingresosVentasMin"
            name="ingresosVentasMin"
            value={filters.ingresosVentasMin}
            onChange={handleFilterChange}
            placeholder="Min. Ingresos Ventas"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="ingresosVentasMax" className="text-gray-700 dark:text-gray-300">Max. Ingresos Ventas</Label>
          <Input
            type="number"
            id="ingresosVentasMax"
            name="ingresosVentasMax"
            value={filters.ingresosVentasMax}
            onChange={handleFilterChange}
            placeholder="Max. Ingresos Ventas"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="activosMin" className="text-gray-700 dark:text-gray-300">Min. Activos</Label>
          <Input
            type="number"
            id="activosMin"
            name="activosMin"
            value={filters.activosMin}
            onChange={handleFilterChange}
            placeholder="Min. Activos"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="activosMax" className="text-gray-700 dark:text-gray-300">Max. Activos</Label>
          <Input
            type="number"
            id="activosMax"
            name="activosMax"
            value={filters.activosMax}
            onChange={handleFilterChange}
            placeholder="Max. Activos"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="patrimonioMin" className="text-gray-700 dark:text-gray-300">Min. Patrimonio</Label>
          <Input
            type="number"
            id="patrimonioMin"
            name="patrimonioMin"
            value={filters.patrimonioMin}
            onChange={handleFilterChange}
            placeholder="Min. Patrimonio"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="patrimonioMax" className="text-gray-700 dark:text-gray-300">Max. Patrimonio</Label>
          <Input
            type="number"
            id="patrimonioMax"
            name="patrimonioMax"
            value={filters.patrimonioMax}
            onChange={handleFilterChange}
            placeholder="Max. Patrimonio"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="impuestoRentaMin" className="text-gray-700 dark:text-gray-300">Min. Impuesto Renta</Label>
          <Input
            type="number"
            id="impuestoRentaMin"
            name="impuestoRentaMin"
            value={filters.impuestoRentaMin}
            onChange={handleFilterChange}
            placeholder="Min. Impuesto Renta"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="impuestoRentaMax" className="text-gray-700 dark:text-gray-300">Max. Impuesto Renta</Label>
          <Input
            type="number"
            id="impuestoRentaMax"
            name="impuestoRentaMax"
            value={filters.impuestoRentaMax}
            onChange={handleFilterChange}
            placeholder="Max. Impuesto Renta"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="utilidadAnImpMin" className="text-gray-700 dark:text-gray-300">Min. Utilidad An. Imp</Label>
          <Input
            type="number"
            id="utilidadAnImpMin"
            name="utilidadAnImpMin"
            value={filters.utilidadAnImpMin}
            onChange={handleFilterChange}
            placeholder="Min. Utilidad An. Imp"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="utilidadAnImpMax" className="text-gray-700 dark:text-gray-300">Max. Utilidad An. Imp</Label>
          <Input
            type="number"
            id="utilidadAnImpMax"
            name="utilidadAnImpMax"
            value={filters.utilidadAnImpMax}
            onChange={handleFilterChange}
            placeholder="Max. Utilidad An. Imp"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="utilidadNetaMin" className="text-gray-700 dark:text-gray-300">Min. Utilidad Neta</Label>
          <Input
            type="number"
            id="utilidadNetaMin"
            name="utilidadNetaMin"
            value={filters.utilidadNetaMin}
            onChange={handleFilterChange}
            placeholder="Min. Utilidad Neta"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
        <div>
          <Label htmlFor="utilidadNetaMax" className="text-gray-700 dark:text-gray-300">Max. Utilidad Neta</Label>
          <Input
            type="number"
            id="utilidadNetaMax"
            name="utilidadNetaMax"
            value={filters.utilidadNetaMax}
            onChange={handleFilterChange}
            placeholder="Max. Utilidad Neta"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button
          onClick={applyFilters}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Apply Filters
        </Button>
        <Button
          onClick={clearFilters}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded shadow-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  )
} 