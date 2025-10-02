'use client'

import { useState } from "react";
import { Company } from "@/types/company";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

interface CompanyHistoryChartsProps {
  history: Company[];
}

interface TooltipPayload {
  name: string;
  value: number | string | null | undefined;
  color: string;
  payload: Company;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}


export default function CompanyHistoryCharts({ history }: CompanyHistoryChartsProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Sort history chronologically (ascending by year)
  const data = [...history]
    .filter((h) => h.anio !== null)
    .sort((a, b) => (a.anio! > b.anio! ? 1 : -1))
    .map((h) => ({
      anio: h.anio,
      ingresos_ventas: h.ingresos_ventas,
      utilidad_neta: h.utilidad_neta,
      impuesto_renta: h.impuesto_renta,
      activos: h.activos,
      patrimonio: h.patrimonio,
      n_empleados: h.n_empleados,
    }));

  const latest = data[data.length - 1];

  const currencySeries = new Set([
    'Ingresos Ventas',
    'Utilidad Neta',
    'Impuesto Renta',
    'Activos',
    'Patrimonio',
  ]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay datos suficientes para mostrar gráficos</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">Año {label}</p>
          {payload.map((entry, index: number) => {
            const name = entry.name as string;
            const raw = entry.value;
            const formatted = raw == null
              ? 'N/A'
              : currencySeries.has(name)
                ? `$${Number(raw).toLocaleString()}`
                : Number(raw).toLocaleString();
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">{name}:</span>{' '}
                {formatted}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium text-gray-900">Análisis Financiero</h3>
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              chartType === 'line'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Líneas
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              chartType === 'bar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Barras
          </button>
        </div>
      </div>

      {/* Revenue & Profit Chart */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">
          Ingresos y Rentabilidad
        </h4>
        <ResponsiveContainer width="100%" height={320}>
          {chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="anio" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                tickFormatter={(value:number) => `$${(value / 1000).toFixed(0)}K`}
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="ingresos_ventas"
                name="Ingresos Ventas"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="utilidad_neta"
                name="Utilidad Neta"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="impuesto_renta"
                name="Impuesto Renta"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4, fill: '#ef4444' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="anio" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                tickFormatter={(value:number) => `$${(value / 1000).toFixed(0)}K`}
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar dataKey="ingresos_ventas" name="Ingresos Ventas" fill="#6366f1" radius={[8, 8, 0, 0]} />
              <Bar dataKey="utilidad_neta" name="Utilidad Neta" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="impuesto_renta" name="Impuesto Renta" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Employees Over Time */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">
          Empleados a lo largo del tiempo
        </h4>
        <ResponsiveContainer width="100%" height={320}>
          {chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="anio" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" tickFormatter={(v:number) => v.toLocaleString()} style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="n_empleados"
                name="Empleados"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0ea5e9' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="anio" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" tickFormatter={(v:number) => v.toLocaleString()} style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              <Bar dataKey="n_empleados" name="Empleados" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Assets & Equity Summary (latest year) */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-1">Activos y Patrimonio</h4>
        <p className="text-xs text-gray-500 mb-4">Valores del último año fiscal ({latest?.anio ?? 'N/A'})</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Activos</p>
            <p className="text-lg font-medium text-gray-900">{typeof latest?.activos === 'number' ? `$${latest.activos.toLocaleString()}` : 'N/A'}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Patrimonio</p>
            <p className="text-lg font-medium text-gray-900">{typeof latest?.patrimonio === 'number' ? `$${latest.patrimonio.toLocaleString()}` : 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 