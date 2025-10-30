'use client';

import { Company } from "@/types/company";

interface CompanyFinancialTimelineProps {
  history: Company[];
}

export function CompanyFinancialTimeline({ history }: CompanyFinancialTimelineProps) {
  // Sort chronologically (newest first)
  const sortedHistory = [...history].sort((a, b) => (b.anio || 0) - (a.anio || 0));

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

  const calculateGrowth = (current: number | null, previous: number | null) => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden shadow-lg shadow-gray-900/5">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-6 py-3">Año</th>
              <th scope="col" className="px-6 py-3 text-right">Ingresos</th>
              <th scope="col" className="px-6 py-3 text-right">Utilidad</th>
              <th scope="col" className="px-6 py-3 text-right">Activos</th>
              <th scope="col" className="px-6 py-3 text-right">Patrimonio</th>
              <th scope="col" className="px-6 py-3 text-right">Empleados</th>
            </tr>
          </thead>
          <tbody>
            {sortedHistory.map((company, index) => {
              const previousYear = sortedHistory[index + 1];
              const revenueGrowth = calculateGrowth(company.ingresos_ventas, previousYear?.ingresos_ventas);
              const profitGrowth = calculateGrowth(company.utilidad_neta, previousYear?.utilidad_neta);

              return (
                <tr key={`${company.id}-${company.anio}`} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal text-gray-900 font-mono">
                        {company.anio || '—'}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-normal rounded uppercase tracking-wider">
                          Más reciente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-sm font-normal text-gray-900 font-mono">
                        {formatCompactCurrency(company.ingresos_ventas)}
                      </span>
                      {revenueGrowth !== null && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          revenueGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-sm font-normal text-gray-900 font-mono">
                        {formatCompactCurrency(company.utilidad_neta)}
                      </span>
                      {profitGrowth !== null && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          profitGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {profitGrowth >= 0 ? '+' : ''}{profitGrowth.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-normal text-gray-900 font-mono">
                      {formatCompactCurrency(company.activos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-normal text-gray-900 font-mono">
                      {formatCompactCurrency(company.patrimonio)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-normal text-gray-900 font-mono">
                      {company.n_empleados?.toLocaleString() || '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

