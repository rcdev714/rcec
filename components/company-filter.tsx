'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Filter } from 'lucide-react';

interface CompanyFilterProps {
  initialFilters: { [key: string]: string | string[] | undefined };
  onApplyFilters: (filters: { [key: string]: string | string[] | undefined }) => void;
  companyCount: number;
}

export function CompanyFilter({ initialFilters, onApplyFilters, companyCount }: CompanyFilterProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Note: checkbox gating removed to simplify UI and reduce vertical space

  const handleApply = async () => {
    try {
      setApplyError(null);
      setIsApplying(true);
      const sanitizedFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => {
          if (Array.isArray(value)) {
            return [
              key,
              value
                .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
                .filter((entry) => typeof entry === 'string' && entry.length),
            ];
          }
          if (typeof value === 'string') {
            return [key, value.trim()];
          }
          return [key, value];
        }),
      );
      const resp = await fetch('/api/usage/search', { method: 'POST' });
      if (resp.status === 401) {
        window.location.href = '/auth/login';
        return;
      }
      if (resp.status === 403) {
        setApplyError('Has alcanzado el límite mensual de búsquedas en tu plan.');
        // Optionally navigate to pricing
        // window.location.href = '/pricing?upgrade=required';
        return;
      }
      // Proceed with filters even if usage API has a transient error (avoid blocking UX)
      if (!resp.ok) {
        console.warn('Usage API non-ok status on apply; continuing with filters');
      }
      onApplyFilters(sanitizedFilters);
    } catch {
      setApplyError('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClear = () => {
    const clearedFilters = Object.fromEntries(Object.keys(filters).map(key => [key, '']));
    onApplyFilters(clearedFilters);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 text-gray-900">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Filter size={14} className="text-gray-500" />
        <h3 className="font-medium text-sm text-gray-900">Filtros</h3>
      </div>

      {/* Sorting controls (top for quick access) */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sortBy" className="text-xs font-medium text-gray-900">
              Ordenar por
            </Label>
            <select
              id="sortBy"
              name="sortBy"
              value={(filters.sortBy as string) || ''}
              onChange={handleSelectChange}
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Relevancia (completitud)</option>
              <option value="ingresos_ventas">Ingresos</option>
              <option value="n_empleados">Empleados</option>
              <option value="utilidad_neta">Utilidad neta</option>
              <option value="activos">Activos</option>
              <option value="anio">Año</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortDir" className="text-xs font-medium text-gray-900">
              Dirección
            </Label>
            <select
              id="sortDir"
              name="sortDir"
              value={(filters.sortDir as string) || ''}
              onChange={handleSelectChange}
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Predeterminado</option>
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-xs font-medium text-gray-900">
            Nombre de empresa
          </Label>
          <Input
            type="text"
            id="nombre"
            name="nombre"
            value={filters.nombre as string}
            onChange={handleFilterChange}
            placeholder="Buscar por nombre..."
            className="bg-white border-gray-300 text-xs py-1.5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruc" className="text-xs font-medium text-gray-900">
            RUC
          </Label>
          <Input
            type="text"
            id="ruc"
            name="ruc"
            value={filters.ruc as string}
            onChange={handleFilterChange}
            placeholder="Número de RUC..."
            className="bg-white border-gray-300 text-xs py-1.5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provincia" className="text-xs font-medium text-gray-900">
            Provincia
          </Label>
          <select
            id="provincia"
            name="provincia"
            value={filters.provincia as string}
            onChange={handleSelectChange}
            className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Todas las provincias</option>
            <option value="AZUAY">Azuay</option>
            <option value="BOLIVAR">Bolívar</option>
            <option value="CAÑAR">Cañar</option>
            <option value="CARCHI">Carchi</option>
            <option value="CHIMBORAZO">Chimborazo</option>
            <option value="COTOPAXI">Cotopaxi</option>
            <option value="EL ORO">El Oro</option>
            <option value="ESMERALDAS">Esmeraldas</option>
            <option value="GALAPAGOS">Galápagos</option>
            <option value="GUAYAS">Guayas</option>
            <option value="IMBABURA">Imbabura</option>
            <option value="LOJA">Loja</option>
            <option value="LOS RIOS">Los Ríos</option>
            <option value="MANABI">Manabí</option>
            <option value="MORONA SANTIAGO">Morona Santiago</option>
            <option value="NAPO">Napo</option>
            <option value="ORELLANA">Orellana</option>
            <option value="PASTAZA">Pastaza</option>
            <option value="PICHINCHA">Pichincha</option>
            <option value="SANTA ELENA">Santa Elena</option>
            <option value="SANTO DOMINGO DE LOS TSACHILAS">Santo Domingo de los Tsáchilas</option>
            <option value="SUCUMBIOS">Sucumbíos</option>
            <option value="TUNGURAHUA">Tungurahua</option>
            <option value="ZAMORA CHINCHIPE">Zamora Chinchipe</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="anio" className="text-xs font-medium text-gray-900">
              Año fiscal
            </Label>
            <select
              id="anio"
              name="anio"
              value={filters.anio as string}
              onChange={handleSelectChange}
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Todos los años</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nEmpleadosMin" className="text-xs font-medium text-gray-900">
              Min. empleados
            </Label>
            <Input
              type="number"
              id="nEmpleadosMin"
              name="nEmpleadosMin"
              value={filters.nEmpleadosMin as string}
              onChange={handleFilterChange}
              placeholder="0"
              className="bg-white border-gray-300 text-xs py-1.5"
            />
          </div>
        </div>

        {/* Max empleados */}
        <div className="space-y-2">
          <Label htmlFor="nEmpleadosMax" className="text-xs font-medium text-gray-900">
            Max. empleados
          </Label>
          <Input
            type="number"
            id="nEmpleadosMax"
            name="nEmpleadosMax"
            value={filters.nEmpleadosMax as string}
            onChange={handleFilterChange}
            placeholder="∞"
            className="bg-white border-gray-300 text-xs py-1.5"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="space-y-4 pt-2 border-t border-gray-200">
        
        <div className="space-y-3">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Min. ingresos ventas</Label>
              <Input
                type="number"
                name="ingresosVentasMin"
                value={filters.ingresosVentasMin as string}
                onChange={handleFilterChange}
                placeholder="0"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Max. ingresos ventas</Label>
              <Input
                type="number"
                name="ingresosVentasMax"
                value={filters.ingresosVentasMax as string}
                onChange={handleFilterChange}
                placeholder="∞"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Min. activos</Label>
              <Input
                type="number"
                name="activosMin"
                value={filters.activosMin as string}
                onChange={handleFilterChange}
                placeholder="0"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Max. activos</Label>
              <Input
                type="number"
                name="activosMax"
                value={filters.activosMax as string}
                onChange={handleFilterChange}
                placeholder="∞"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Min. patrimonio</Label>
              <Input
                type="number"
                name="patrimonioMin"
                value={filters.patrimonioMin as string}
                onChange={handleFilterChange}
                placeholder="0"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Max. patrimonio</Label>
              <Input
                type="number"
                name="patrimonioMax"
                value={filters.patrimonioMax as string}
                onChange={handleFilterChange}
                placeholder="∞"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Min. utilidad neta</Label>
              <Input
                type="number"
                name="utilidadNetaMin"
                value={filters.utilidadNetaMin as string}
                onChange={handleFilterChange}
                placeholder="0"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Max. utilidad neta</Label>
              <Input
                type="number"
                name="utilidadNetaMax"
                value={filters.utilidadNetaMax as string}
                onChange={handleFilterChange}
                placeholder="∞"
                className="bg-white border-gray-300 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 justify-center">
        <Button
          onClick={handleApply}
          className="text-xs h-8 bg-indigo-500 text-white hover:bg-indigo-600 transition-transform active:scale-95"
          disabled={isApplying}
        >
          {isApplying ? 'Aplicando...' : 'Aplicar filtros'}
        </Button>
        <Button
          onClick={handleClear}
          variant="outline"
          className="px-3 text-xs h-8"
        >
          Limpiar
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-center pt-2 border-t border-gray-200">
        {applyError && (
          <p className="text-xs text-destructive mb-1">{applyError}</p>
        )}
        <p className="text-xs text-gray-500">
          {companyCount.toLocaleString()} empresa{companyCount !== 1 ? 's' : ''} encontrada{companyCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

 