'use client'

import { useEffect, useId, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  value: number
}

type TimePeriod = '7D' | '1M' | '3M'

export default function UsersOverTimeChart() {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7D')
  const gradientBaseId = useId().replace(/:/g, '')

  const getDaysFromPeriod = (period: TimePeriod): number => {
    switch (period) {
      case '7D':
        return 7
      case '1M':
        return 30
      case '3M':
        return 90
      default:
        return 7
    }
  }

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case '7D':
        return '7 días'
      case '1M':
        return '1 mes'
      case '3M':
        return '3 meses'
      default:
        return '7 días'
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null)
        setLoading(true)
        const days = getDaysFromPeriod(timePeriod)
        const response = await fetch(`/api/admin/users-timeseries?days=${days}`)

        if (!response.ok) {
          console.error('Error fetching users timeseries data: Invalid response status')
          setError('No pudimos cargar los datos de usuarios. Intenta nuevamente.')
          setData([])
          setTotal(0)
          setLoading(false)
          return
        }

        const timeseriesData = await response.json()

        const formatDate = (dateStr: string) => {
          try {
            const hasTimeComponent = /T/.test(dateStr) || /[+-]\d{2}:?\d{2}$/.test(dateStr) || /Z$/.test(dateStr)
            const normalizedDate = hasTimeComponent ? dateStr : `${dateStr}T00:00:00Z`
            const parsedDate = new Date(normalizedDate)
            if (Number.isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date')
            }
            return parsedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
          } catch (err) {
            console.warn('Error formatting date:', dateStr, err)
            return dateStr || 'Fecha inválida'
          }
        }

        const formattedData: DataPoint[] = timeseriesData.data.map((d: { date: string; users: number }) => ({
          date: formatDate(d.date),
          value: d.users
        }))

        setData(formattedData)
        setTotal(timeseriesData.data.length > 0 ? timeseriesData.data[timeseriesData.data.length - 1].users : 0)
      } catch (error) {
        console.error('Error fetching users timeseries data:', error)
        setError('Ocurrió un problema al cargar el gráfico.')
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [timePeriod])

  if (error) {
    return (
      <Card className="border-gray-200 shadow-sm bg-gray-50">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Usuarios en el Tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm bg-gray-50">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Usuarios en el Tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400 text-sm">Cargando gráfico...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm bg-gray-50">
      <CardHeader className="pb-3 border-b border-gray-100/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-900">
            Usuarios en el Tiempo ({getPeriodLabel(timePeriod)})
          </CardTitle>
          <div className="flex gap-1">
            <button
              onClick={() => setTimePeriod('7D')}
              className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                timePeriod === '7D'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimePeriod('1M')}
              className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                timePeriod === '1M'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              1M
            </button>
            <button
              onClick={() => setTimePeriod('3M')}
              className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                timePeriod === '3M'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              3M
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total de Usuarios</span>
            <span className="text-sm font-semibold text-gray-900">{total.toLocaleString()}</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id={`${gradientBaseId}-users`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeWidth={1} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  formatter={(value: number | undefined) => {
                    if (value === undefined || value === null) {
                      return ['0', 'Usuarios']
                    }
                    return [value.toLocaleString(), 'Usuarios']
                  }}
                />
                <Area
                  type="linear"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill={`url(#${gradientBaseId}-users)`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

