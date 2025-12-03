'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  TrendingUp,
  UserPlus,
  UserMinus,
  ArrowUpCircle,
  RefreshCw,
  Search,
  Download,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubscriptionMetrics {
  totalUsers: number
  planDistribution: {
    FREE: number
    PRO: number
    ENTERPRISE: number
  }
  recentSignups: number
  recentCancellations: number
  recentUpgrades: number
  churnRate: number
  mrr: number // Monthly Recurring Revenue
  topUsers: Array<{
    id: string
    email: string
    plan: string
    usage: {
      searches: number
      exports: number
    }
    revenue: number
  }>
}

export default function UserSubscriptionMetrics() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSubscriptionMetrics()
  }, [])

  async function fetchSubscriptionMetrics() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/subscription-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching subscription metrics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'PRO':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'ENTERPRISE':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Métricas de Usuarios y Suscripciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            <div className="h-4 bg-gray-100 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPaidUsers = (metrics?.planDistribution.PRO || 0) + (metrics?.planDistribution.ENTERPRISE || 0)
  const conversionRate = metrics?.totalUsers ? (totalPaidUsers / metrics.totalUsers) * 100 : 0

  return (
    <Card className="border-gray-200 shadow-sm h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          Métricas de Usuarios y Suscripciones
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900"
          onClick={fetchSubscriptionMetrics}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="h-3 w-3" /> Total Usuarios
            </p>
            <p className="text-2xl font-bold text-gray-900">{metrics?.totalUsers || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> MRR
            </p>
            <p className="text-2xl font-bold text-green-600">${metrics?.mrr || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Conversión
            </p>
            <p className="text-2xl font-bold text-blue-600">{conversionRate.toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <UserMinus className="h-3 w-3" /> Abandono
            </p>
            <p className={cn("text-2xl font-bold", (metrics?.churnRate || 0) > 5 ? "text-red-600" : "text-green-600")}>
              {metrics?.churnRate?.toFixed(1) || '0.0'}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Plan Distribution */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Distribución de Planes</h4>
            <div className="space-y-4">
              {Object.entries(metrics?.planDistribution || {}).map(([plan, count]) => (
                <div key={plan} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("font-normal", getPlanColor(plan))}>
                        {plan}
                      </Badge>
                      <span className="text-gray-500 text-xs">
                        {metrics?.totalUsers ? ((count / metrics.totalUsers) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full",
                        plan === 'PRO' ? "bg-blue-500" :
                          plan === 'ENTERPRISE' ? "bg-purple-500" : "bg-gray-400"
                      )}
                      style={{
                        width: `${metrics?.totalUsers ? (count / metrics.totalUsers) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Stats */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Actividad Reciente (30 días)</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-green-100 shadow-sm">
                    <UserPlus className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Nuevos Registros</p>
                    <p className="text-xs text-green-700">Usuarios nuevos este mes</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-green-700">{metrics?.recentSignups || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-blue-100 shadow-sm">
                    <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Actualizaciones</p>
                    <p className="text-xs text-blue-700">Mejoras de plan</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-blue-700">{metrics?.recentUpgrades || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-red-100 shadow-sm">
                    <UserMinus className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-900">Cancelaciones</p>
                    <p className="text-xs text-red-700">Usuarios perdidos</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-red-700">{metrics?.recentCancellations || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Top Usuarios por Ingresos</h4>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Uso</th>
                  <th className="px-4 py-3 text-right">Ingresos Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrics?.topUsers?.slice(0, 5).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {user.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("font-normal", getPlanColor(user.plan))}>
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          {user.usage.searches} <Search className="h-3 w-3" />
                        </span>
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          {user.usage.exports} <Download className="h-3 w-3" />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      ${user.revenue}
                    </td>
                  </tr>
                )) || (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No hay datos disponibles
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        {(metrics?.churnRate || 0) > 10 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            <UserMinus className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Alta tasa de abandono detectada ({metrics?.churnRate?.toFixed(1)}%). Considera mejorar las estrategias de retención.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
