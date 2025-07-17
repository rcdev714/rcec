'use client'

import { Company } from "@/types/company";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
      ingresos_ventas: h.ingresos_ventas,
      utilidad_neta: h.utilidad_neta,
      impuesto_renta: h.impuesto_renta,
    }));

  if (data.length === 0) return null;

  return (
    <div className="mt-10">
      <h3 className="text-lg font-medium mb-4">Evolución Financiera</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 20, right: 40, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="anio" stroke="var(--muted-foreground)" />
          <YAxis
            stroke="var(--muted-foreground)"
            tickFormatter={(value:number) => value.toLocaleString()}
          />
          <Tooltip formatter={(value:number) => value.toLocaleString()} />
          <Legend />
          <Line
            type="monotone"
            dataKey="ingresos_ventas"
            name="Ingresos Ventas"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="utilidad_neta"
            name="Utilidad Neta"
            stroke="#82ca9d"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="impuesto_renta"
            name="Impuesto Renta"
            stroke="#ff7300"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 