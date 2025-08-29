'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      <Card>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.searches, d.exports, d.prompts)))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Usage Analytics</CardTitle>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-blue-600">{totalSearches.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Total Searches</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{totalExports.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Total Exports</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-600">{totalPrompts.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Total Prompts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-600">{avgDailySearches.toFixed(0)}</p>
            <p className="text-xs text-gray-600">Avg Daily Searches</p>
          </div>
        </div>

        {/* Simple Chart */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Activity over time</span>
            <div className="flex space-x-4">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                Searches
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                Exports
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
                Prompts
              </span>
            </div>
          </div>
          
          <div className="h-32 flex items-end justify-between space-x-1">
            {data.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full flex flex-col justify-end h-24 space-y-0.5">
                  <div 
                    className="bg-blue-500 w-full rounded-t"
                    style={{ height: `${(day.searches / maxValue) * 100}%` }}
                    title={`${day.searches} searches`}
                  ></div>
                  <div 
                    className="bg-green-500 w-full"
                    style={{ height: `${(day.exports / maxValue) * 100}%` }}
                    title={`${day.exports} exports`}
                  ></div>
                  <div 
                    className="bg-purple-500 w-full"
                    style={{ height: `${(day.prompts / maxValue) * 100}%` }}
                    title={`${day.prompts} prompts`}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left">
                  {new Date(day.date).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Indicators */}
        {data.length >= 2 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Searches', current: data[data.length - 1]?.searches || 0, previous: data[data.length - 2]?.searches || 0 },
              { label: 'Exports', current: data[data.length - 1]?.exports || 0, previous: data[data.length - 2]?.exports || 0 },
              { label: 'Prompts', current: data[data.length - 1]?.prompts || 0, previous: data[data.length - 2]?.prompts || 0 }
            ].map(({ label, current, previous }) => {
              const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
              return (
                <div key={label} className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">{label} (vs yesterday)</p>
                  <p className={`text-sm font-semibold ${
                    change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
