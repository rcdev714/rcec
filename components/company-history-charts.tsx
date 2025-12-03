'use client'

import { useState, useId } from 'react';
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
import { Button } from "@/components/ui/button";
import { LayoutGrid, Layers } from "lucide-react";

interface CompanyHistoryChartsProps {
  history: Company[];
}

export default function CompanyHistoryCharts({ history }: CompanyHistoryChartsProps) {
  const [viewMode, setViewMode] = useState<'separate' | 'unified'>('separate');
  const gradientBaseId = useId().replace(/:/g, '');

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


  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-xs font-normal">No hay datos suficientes para mostrar gráficos</p>
      </div>
    );
  }

  // Unified data for all metrics
  const unifiedData = data.map(d => ({
    anio: d.anio,
    ingresos: d.ingresos_ventas,
    utilidad: d.utilidad_neta,
    activos: d.activos,
    patrimonio: d.patrimonio,
    empleados: d.n_empleados,
  }));

  // Separate charts configuration
  const chartConfig = [
    {
      title: 'Ingresos',
      data: data.map(d => ({ anio: d.anio, value: d.ingresos_ventas })),
      isCurrency: true,
    },
    {
      title: 'Utilidad',
      data: data.map(d => ({ anio: d.anio, value: d.utilidad_neta })),
      isCurrency: true,
    },
    {
      title: 'Activos',
      data: data.map(d => ({ anio: d.anio, value: d.activos })),
      isCurrency: true,
    },
    {
      title: 'Patrimonio',
      data: data.map(d => ({ anio: d.anio, value: d.patrimonio })),
      isCurrency: true,
    },
    {
      title: 'Empleados',
      data: data.map(d => ({ anio: d.anio, value: d.n_empleados })),
      isCurrency: false,
    },
  ];

  // Colors for unified view - cohesive gray/blue/indigo palette
  const unifiedColors = [
    { name: 'ingresos', color: '#6366f1', label: 'Ingresos' }, // Indigo
    { name: 'utilidad', color: '#3b82f6', label: 'Utilidad' }, // Blue
    { name: 'activos', color: '#64748b', label: 'Activos' }, // Slate Gray
    { name: 'patrimonio', color: '#0ea5e9', label: 'Patrimonio' }, // Sky Blue
    { name: 'empleados', color: '#818cf8', label: 'Empleados' }, // Light Indigo
  ];

  return (
    <div className="space-y-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
      {/* Toggle Buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <Button
          size="sm"
          onClick={() => setViewMode('separate')}
          className={`h-8 w-8 p-0 transition-all ${
            viewMode === 'separate'
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300 hover:border-indigo-300'
          }`}
          title="Vista Separada"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => setViewMode('unified')}
          className={`h-8 w-8 p-0 transition-all ${
            viewMode === 'unified'
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300 hover:border-indigo-300'
          }`}
          title="Vista Unificada"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === 'separate' ? (
        // Separate Charts View
        <div className="space-y-6">
          {chartConfig.map((chart, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{chart.title}</span>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`${gradientBaseId}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="anio"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                      formatter={(value: number) => [
                        chart.isCurrency ? formatCompactCurrency(value) : value.toLocaleString(),
                        chart.title
                      ]}
                    />
                    <Area
                      type="linear"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill={`url(#${gradientBaseId}-${idx})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Unified Chart View
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Todas las Métricas</span>
            <div className="flex items-center gap-2 flex-wrap">
              {unifiedColors.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={unifiedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  {unifiedColors.map((item, idx) => (
                    <linearGradient key={idx} id={`${gradientBaseId}-unified-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={item.color} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={item.color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="anio"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  formatter={(value: number, name: string) => {
                    const item = unifiedColors.find(c => c.name === name);
                    return [
                      name === 'empleados' ? value.toLocaleString() : formatCompactCurrency(value),
                      item?.label || name
                    ];
                  }}
                />
                {unifiedColors.map((item, idx) => (
                  <Area
                    key={idx}
                    type="linear"
                    dataKey={item.name}
                    stroke={item.color}
                    strokeWidth={2}
                    fill={`url(#${gradientBaseId}-unified-${idx})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
