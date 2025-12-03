'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Search,
  Download,
  MessageSquare,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface UsageData {
  date: string
  searches: number
  exports: number
  prompts: number
  revenue: number
}

export default function UsageAnalytics() {
  const [data, setData] = useState<UsageData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const fetchUsageData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/usage-analytics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setData(data)
      }
    } catch (error) {
      console.error('Error fetching usage analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchUsageData()
  }, [fetchUsageData])

  const totalSearches = data.reduce((sum, day) => sum + day.searches, 0)
  const totalExports = data.reduce((sum, day) => sum + day.exports, 0)
  const totalPrompts = data.reduce((sum, day) => sum + day.prompts, 0)
  const avgDailySearches = data.length > 0 ? totalSearches / data.length : 0

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analíticas de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.searches, d.exports, d.prompts)))

  return (
    <Card className="border-gray-200 shadow-sm h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Analíticas de Uso
        </CardTitle>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="text-xs border-none bg-gray-50 rounded px-2 py-1 text-gray-600 focus:ring-0 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Search className="h-3 w-3" /> Búsquedas
            </p>
            <p className="text-xl font-bold text-gray-900">{totalSearches.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Download className="h-3 w-3" /> Exportaciones
            </p>
            <p className="text-xl font-bold text-gray-900">{totalExports.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Prompts
            </p>
            <p className="text-xl font-bold text-gray-900">{totalPrompts.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Promedio Diario
            </p>
            <p className="text-xl font-bold text-gray-900">{avgDailySearches.toFixed(0)}</p>
          </div>
        </div>

        {/* Simple Chart */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-gray-600 border-b border-gray-100 pb-2">
            <span className="font-medium">Actividad en el tiempo</span>
            <div className="flex space-x-4">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Búsquedas
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Exportaciones
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Prompts
              </span>
            </div>
          </div>

          <div className="h-40 flex items-end justify-between space-x-1 pt-4">
            {data.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-semibold mb-1">{new Date(day.date).toLocaleDateString()}</div>
                  <div>Search: {day.searches}</div>
                  <div>Export: {day.exports}</div>
                  <div>Prompt: {day.prompts}</div>
                </div>

                <div className="w-full flex flex-col justify-end h-32 space-y-0.5 relative">
                  {/* Bars stacked */}
                  <div
                    className="bg-purple-500 w-full opacity-80 hover:opacity-100 transition-opacity rounded-t-sm"
                    style={{ height: `${Math.max((day.prompts / maxValue) * 100, 2)}%` }}
                  ></div>
                  <div
                    className="bg-green-500 w-full opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max((day.exports / maxValue) * 100, 2)}%` }}
                  ></div>
                  <div
                    className="bg-blue-500 w-full opacity-80 hover:opacity-100 transition-opacity rounded-b-sm"
                    style={{ height: `${Math.max((day.searches / maxValue) * 100, 2)}%` }}
                  ></div>
                </div>

                {/* Date label - show only some dates to avoid clutter */}
                <span className="text-[10px] text-gray-400 mt-2 transform -rotate-45 origin-top-left h-4 w-4 overflow-visible whitespace-nowrap">
                  {index % Math.ceil(data.length / 7) === 0 ? new Date(day.date).toLocaleDateString(undefined, {
                    month: 'numeric',
                    day: 'numeric'
                  }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
