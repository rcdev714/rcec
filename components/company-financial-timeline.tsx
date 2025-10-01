'use client';

import { Company } from "@/types/company";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CompanyFinancialTimelineProps {
  history: Company[];
}

export function CompanyFinancialTimeline({ history }: CompanyFinancialTimelineProps) {
  // Sort chronologically (newest first for social media feel)
  const sortedHistory = [...history].sort((a, b) => (b.anio || 0) - (a.anio || 0));

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  const calculateGrowth = (current: number | null, previous: number | null) => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-4">
      {sortedHistory.map((company, index) => {
        const previousYear = sortedHistory[index + 1];
        const revenueGrowth = calculateGrowth(company.ingresos_ventas, previousYear?.ingresos_ventas);
        const profitGrowth = calculateGrowth(company.utilidad_neta, previousYear?.utilidad_neta);

        return (
          <div key={`${company.id}-${company.anio}`} className="relative">
            {/* Timeline connector */}
            {index < sortedHistory.length - 1 && (
              <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gray-200 -mb-4" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-4 top-8 w-4 h-4 rounded-full bg-gray-900 border-4 border-white ring-2 ring-gray-100 z-10" />

            {/* Card content */}
            <div className="ml-12 bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
              {/* Year badge */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xl font-medium text-gray-900">
                  {company.anio}
                </p>
                {index === 0 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    Más reciente
                  </span>
                )}
              </div>

              {/* Key metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Ingresos Ventas</p>
                  <p className="text-lg font-normal text-gray-900">
                    {formatCurrency(company.ingresos_ventas)}
                  </p>
                  {revenueGrowth !== null && (
                    <div className={`flex items-center gap-1 text-xs ${
                      revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {revenueGrowth >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="font-medium">{Math.abs(revenueGrowth).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Utilidad Neta</p>
                  <p className="text-lg font-normal text-gray-900">
                    {formatCurrency(company.utilidad_neta)}
                  </p>
                  {profitGrowth !== null && (
                    <div className={`flex items-center gap-1 text-xs ${
                      profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profitGrowth >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="font-medium">{Math.abs(profitGrowth).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Activos</p>
                  <p className="text-lg font-normal text-gray-900">
                    {formatCurrency(company.activos)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Patrimonio</p>
                  <p className="text-lg font-normal text-gray-900">
                    {formatCurrency(company.patrimonio)}
                  </p>
                </div>
              </div>

              {/* Additional details - collapsible look */}
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Impuesto Renta</p>
                    <p className="text-sm font-normal text-gray-900">
                      {formatCurrency(company.impuesto_renta)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gastos Totales</p>
                    <p className="text-sm font-normal text-gray-900">
                      {formatCurrency(company.total_gastos)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gastos Financieros</p>
                    <p className="text-sm font-normal text-gray-900">
                      {formatCurrency(company.gastos_financieros)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Empleados</p>
                    <p className="text-sm font-normal text-gray-900">
                      {company.n_empleados?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

