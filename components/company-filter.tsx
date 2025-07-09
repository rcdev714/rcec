'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp } from 'lucide-react'; // Import icons

interface CompanyFilterProps {
  initialFilters: { [key: string]: string | string[] | undefined };
  onApplyFilters: (filters: { [key: string]: string | string[] | undefined }) => void;
  companyCount: number;
}

export function CompanyFilter({ initialFilters, onApplyFilters, companyCount }: CompanyFilterProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // New state for toggling

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleClear = () => {
    const clearedFilters = Object.fromEntries(Object.keys(filters).map(key => [key, '']));
    onApplyFilters(clearedFilters);
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-950 to-gray-900 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 w-full max-w-3xl mx-auto">
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <Label htmlFor="ruc" className="text-gray-700 dark:text-gray-300">RUC</Label>
          <Input
            type="text"
            id="ruc"
            name="ruc"
            value={filters.ruc as string}
            onChange={handleFilterChange}
            placeholder="RUC"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <Label htmlFor="nombre" className="text-gray-700 dark:text-gray-300">Nombre</Label>
          <Input
            type="text"
            id="nombre"
            name="nombre"
            value={filters.nombre as string}
            onChange={handleFilterChange}
            placeholder="Nombre"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
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
            value={filters.provincia as string}
            onChange={handleFilterChange}
            placeholder="Provincia"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <Label htmlFor="anio" className="text-gray-700 dark:text-gray-300">Año Fiscal</Label>
          <Input
            type="number"
            id="anio"
            name="anio"
            value={filters.anio as string}
            onChange={handleFilterChange}
            placeholder="Año Fiscal"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
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
            value={filters.nEmpleadosMin as string}
            onChange={handleFilterChange}
            placeholder="Min. Empleados"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
          />
        </div>
        <div>
          <Label htmlFor="nEmpleadosMax" className="text-gray-700 dark:text-gray-300">Max. Empleados</Label>
          <Input
            type="number"
            id="nEmpleadosMax"
            name="nEmpleadosMax"
            value={filters.nEmpleadosMax as string}
            onChange={handleFilterChange}
            placeholder="Max. Empleados"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
          />
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <Button
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="flex items-center justify-between w-full bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-900 font-bold py-2 px-4 rounded shadow-md dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 dark:text-white"
      >
        <span>Filtros Avanzados</span>
        {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </Button>

      {/* Advanced Filters Section */}
      {showAdvancedFilters && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-4 mb-4">

            <div>
              <Label htmlFor="nombreComercial" className="text-gray-700 dark:text-gray-300">Nombre Comercial</Label>
              <Input
                type="text"
                id="nombreComercial"
                name="nombreComercial"
                value={filters.nombreComercial as string}
                onChange={handleFilterChange}
                placeholder="Nombre Comercial"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="ingresosVentasMin" className="text-gray-700 dark:text-gray-300">Min. Ingresos Ventas</Label>
              <Input
                type="number"
                id="ingresosVentasMin"
                name="ingresosVentasMin"
                value={filters.ingresosVentasMin as string}
                onChange={handleFilterChange}
                placeholder="Min. Ingresos Ventas"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <Label htmlFor="ingresosVentasMax" className="text-gray-700 dark:text-gray-300">Max. Ingresos Ventas</Label>
              <Input
                type="number"
                id="ingresosVentasMax"
                name="ingresosVentasMax"
                value={filters.ingresosVentasMax as string}
                onChange={handleFilterChange}
                placeholder="Max. Ingresos Ventas"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="activosMin" className="text-gray-700 dark:text-gray-300">Min. Activos</Label>
              <Input
                type="number"
                id="activosMin"
                name="activosMin"
                value={filters.activosMin as string}
                onChange={handleFilterChange}
                placeholder="Min. Activos"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <Label htmlFor="activosMax" className="text-gray-700 dark:text-gray-300">Max. Activos</Label>
              <Input
                type="number"
                id="activosMax"
                name="activosMax"
                value={filters.activosMax as string}
                onChange={handleFilterChange}
                placeholder="Max. Activos"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="patrimonioMin" className="text-gray-700 dark:text-gray-300">Min. Patrimonio</Label>
              <Input
                type="number"
                id="patrimonioMin"
                name="patrimonioMin"
                value={filters.patrimonioMin as string}
                onChange={handleFilterChange}
                placeholder="Min. Patrimonio"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <Label htmlFor="patrimonioMax" className="text-gray-700 dark:text-gray-300">Max. Patrimonio</Label>
              <Input
                type="number"
                id="patrimonioMax"
                name="patrimonioMax"
                value={filters.patrimonioMax as string}
                onChange={handleFilterChange}
                placeholder="Max. Patrimonio"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="impuestoRentaMin" className="text-gray-700 dark:text-gray-300">Min. Impuesto Renta</Label>
              <Input
                type="number"
                id="impuestoRentaMin"
                name="impuestoRentaMin"
                value={filters.impuestoRentaMin as string}
                onChange={handleFilterChange}
                placeholder="Min. Impuesto Renta"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <Label htmlFor="impuestoRentaMax" className="text-gray-700 dark:text-gray-300">Max. Impuesto Renta</Label>
              <Input
                type="number"
                id="impuestoRentaMax"
                name="impuestoRentaMax"
                value={filters.impuestoRentaMax as string}
                onChange={handleFilterChange}
                placeholder="Max. Impuesto Renta"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="utilidadAnImpMin" className="text-gray-700 dark:text-gray-300">Min. Utilidad An. Imp</Label>
              <Input
                type="number"
                id="utilidadAnImpMin"
                name="utilidadAnImpMin"
                value={filters.utilidadAnImpMin as string}
                onChange={handleFilterChange}
                placeholder="Min. Utilidad An. Imp"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <Label htmlFor="utilidadAnImpMax" className="text-gray-700 dark:text-gray-300">Max. Utilidad An. Imp</Label>
              <Input
                type="number"
                id="utilidadAnImpMax"
                name="utilidadAnImpMax"
                value={filters.utilidadAnImpMax as string}
                onChange={handleFilterChange}
                placeholder="Max. Utilidad An. Imp"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="utilidadNetaMin" className="text-gray-700 dark:text-gray-300">Min. Utilidad Neta</Label>
              <Input
                type="number"
                id="utilidadNetaMin"
                name="utilidadNetaMin"
                value={filters.utilidadNetaMin as string}
                onChange={handleFilterChange}
                placeholder="Min. Utilidad Neta"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <Label htmlFor="utilidadNetaMax" className="text-gray-700 dark:text-gray-300">Max. Utilidad Neta</Label>
              <Input
                type="number"
                id="utilidadNetaMax"
                name="utilidadNetaMax"
                value={filters.utilidadNetaMax as string}
                onChange={handleFilterChange}
                placeholder="Max. Utilidad Neta"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button
          onClick={handleApply}
          className="flex-1 bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-900 font-bold py-2 px-4 rounded shadow-md dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 dark:text-white"
        >
          Aplicar 
        </Button>
        <Button
          onClick={handleClear}
          className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-900 font-bold py-2 px-4 rounded shadow-md dark:from-gray-800 dark:to-gray-900 dark:hover:from-gray-700 dark:hover:to-gray-800 dark:text-white"
        >
          Limpiar
        </Button>
      </div>
      {/* Company Count */}
      <div className="text-center mt-4 text-gray-700 dark:text-gray-300">
        <p>Total de Empresas: <span className="font-bold">{companyCount}</span></p>
      </div>
    </div>
  )
}
 