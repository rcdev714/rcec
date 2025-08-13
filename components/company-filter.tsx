'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface CompanyFilterProps {
  initialFilters: { [key: string]: string | string[] | undefined };
  onApplyFilters: (filters: { [key: string]: string | string[] | undefined }) => void;
  companyCount: number;
}

export function CompanyFilter({ initialFilters, onApplyFilters, companyCount }: CompanyFilterProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  const handleApply = async () => {
    try {
      setApplyError(null);
      setIsApplying(true);
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
      onApplyFilters(filters);
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
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Filter size={16} className="text-muted-foreground" />
        <h3 className="font-medium text-foreground">Filtros</h3>
      </div>

      {/* Quick Filters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-sm font-medium text-foreground">
            Nombre de empresa
          </Label>
          <Input
            type="text"
            id="nombre"
            name="nombre"
            value={filters.nombre as string}
            onChange={handleFilterChange}
            placeholder="Buscar por nombre..."
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruc" className="text-sm font-medium text-foreground">
            RUC
          </Label>
          <Input
            type="text"
            id="ruc"
            name="ruc"
            value={filters.ruc as string}
            onChange={handleFilterChange}
            placeholder="Número de RUC..."
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provincia" className="text-sm font-medium text-foreground">
            Provincia
          </Label>
          <select
            id="provincia"
            name="provincia"
            value={filters.provincia as string}
            onChange={handleSelectChange}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            <Label htmlFor="anio" className="text-sm font-medium text-foreground">
              Año fiscal
            </Label>
            <select
              id="anio"
              name="anio"
              value={filters.anio as string}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos los años</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="2019">2019</option>
              <option value="2018">2018</option>
              <option value="2017">2017</option>
              <option value="2016">2016</option>
              <option value="2015">2015</option>
              <option value="2014">2014</option>
              <option value="2013">2013</option>
              <option value="2012">2012</option>
              <option value="2011">2011</option>
              <option value="2010">2010</option>
              <option value="2009">2009</option>
              <option value="2008">2008</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nEmpleadosMin" className="text-sm font-medium text-foreground">
              Min. empleados
            </Label>
            <Input
              type="number"
              id="nEmpleadosMin"
              name="nEmpleadosMin"
              value={filters.nEmpleadosMin as string}
              onChange={handleFilterChange}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Filtros financieros</span>
        {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="nombreComercial" className="text-sm font-medium text-foreground">
              Nombre comercial
            </Label>
            <Input
              type="text"
              id="nombreComercial"
              name="nombreComercial"
              value={filters.nombreComercial as string}
              onChange={handleFilterChange}
              placeholder="Nombre comercial..."
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Rangos financieros</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Min. ingresos ventas</Label>
                <Input
                  type="number"
                  name="ingresosVentasMin"
                  value={filters.ingresosVentasMin as string}
                  onChange={handleFilterChange}
                  placeholder="0"
                  className="bg-background border-border text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max. ingresos ventas</Label>
                <Input
                  type="number"
                  name="ingresosVentasMax"
                  value={filters.ingresosVentasMax as string}
                  onChange={handleFilterChange}
                  placeholder="∞"
                  className="bg-background border-border text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Min. activos</Label>
                <Input
                  type="number"
                  name="activosMin"
                  value={filters.activosMin as string}
                  onChange={handleFilterChange}
                  placeholder="0"
                  className="bg-background border-border text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max. activos</Label>
                <Input
                  type="number"
                  name="activosMax"
                  value={filters.activosMax as string}
                  onChange={handleFilterChange}
                  placeholder="∞"
                  className="bg-background border-border text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Min. patrimonio</Label>
                <Input
                  type="number"
                  name="patrimonioMin"
                  value={filters.patrimonioMin as string}
                  onChange={handleFilterChange}
                  placeholder="0"
                  className="bg-background border-border text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max. patrimonio</Label>
                <Input
                  type="number"
                  name="patrimonioMax"
                  value={filters.patrimonioMax as string}
                  onChange={handleFilterChange}
                  placeholder="∞"
                  className="bg-background border-border text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Min. utilidad neta</Label>
                <Input
                  type="number"
                  name="utilidadNetaMin"
                  value={filters.utilidadNetaMin as string}
                  onChange={handleFilterChange}
                  placeholder="0"
                  className="bg-background border-border text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max. utilidad neta</Label>
                <Input
                  type="number"
                  name="utilidadNetaMax"
                  value={filters.utilidadNetaMax as string}
                  onChange={handleFilterChange}
                  placeholder="∞"
                  className="bg-background border-border text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 justify-center">
        <Button
          onClick={handleApply}
          className="flex-1 text-sm h-9 border hover:text-gray-600 border-gray-300"
          disabled={isApplying}
        >
          {isApplying ? 'Aplicando...' : 'Aplicar filtros'}
        </Button>
        <Button
          onClick={handleClear}
          variant="outline"
          className="px-4 text-sm h-9"
        >
          Limpiar
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-center pt-2 border-t border-border">
        {applyError && (
          <p className="text-xs text-destructive mb-1">{applyError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {companyCount.toLocaleString()} empresa{companyCount !== 1 ? 's' : ''} encontrada{companyCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

 