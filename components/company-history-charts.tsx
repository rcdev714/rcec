'use client'

import { Company } from "@/types/company";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CompanyHistoryChartsProps {
  history: Company[];
}

export default function CompanyHistoryCharts({ history }: CompanyHistoryChartsProps) {
  // Sort history chronologically (ascending by year)
  const data = [...history]
    .filter((h) => h.anio !== null)
    .sort((a, b) => (a.anio! > b.anio! ? 1 : -1))
    .map((h) => ({
      anio: h.anio,
      ingresos_ventas: h.ingresos_ventas || 0,
      utilidad_neta: h.utilidad_neta || 0,
      activos: h.activos || 0,
      patrimonio: h.patrimonio || 0,
      n_empleados: h.n_empleados || 0,
    }));

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

  const formatValue = (value: number, name: string) => {
    if (name === 'n_empleados' || name === 'empleados') {
      return value.toLocaleString();
    }
    return formatCompactCurrency(value);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-xs font-normal">No hay datos suficientes para mostrar gráficos</p>
      </div>
    );
  }

  const chartConfig = [
    {
      title: 'Ingresos y Utilidad',
      data: data.map(d => ({
        anio: d.anio,
        ingresos: d.ingresos_ventas,
        utilidad: d.utilidad_neta,
      })),
      isCombined: true,
    },
    {
      title: 'Activos y Patrimonio',
      data: data.map(d => ({
        anio: d.anio,
        activos: d.activos,
        patrimonio: d.patrimonio,
      })),
      isCombined: true,
    },
    {
      title: 'Empleados',
      data: data.map(d => ({
        anio: d.anio,
        empleados: d.n_empleados,
      })),
      isCombined: false,
    },
  ];

  return (
    <div className="space-y-6">
      {chartConfig.map((chart, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{chart.title}</span>
            {chart.isCombined && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-xs text-gray-600">
                    {chart.title.includes('Ingresos') ? 'Ingresos' : 'Activos'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <span className="text-xs text-gray-600">
                    {chart.title.includes('Ingresos') ? 'Utilidad' : 'Patrimonio'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              {chart.isCombined ? (
                <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="anio"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatValue(value, name),
                      name === 'ingresos' ? 'Ingresos' : name === 'utilidad' ? 'Utilidad' : name === 'activos' ? 'Activos' : 'Patrimonio'
                    ]}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey={chart.title.includes('Ingresos') ? 'ingresos' : 'activos'}
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey={chart.title.includes('Ingresos') ? 'utilidad' : 'patrimonio'}
                    stroke="#9ca3af"
                    fill="#f3f4f6"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="anio"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value: number) => [formatValue(value, 'empleados'), 'Empleados']}
                  />
                  <Area
                    type="monotone"
                    dataKey="empleados"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
