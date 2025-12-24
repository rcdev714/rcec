'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  CreditCard,
  DollarSign,
  Activity,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react'
import PaymentSystemStatus from '@/components/admin/payment-system-status'
import UserSubscriptionMetrics from '@/components/admin/user-subscription-metrics'
import SystemHealthMonitor from '@/components/admin/system-health-monitor'
import UsageAnalytics from '@/components/admin/usage-analytics'
import RecentActivity from '@/components/admin/recent-activity'
import UsersOverTimeChart from '@/components/admin/users-over-time-chart'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  monthlyRevenue: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-100 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardStats}
          disabled={refreshing}
          className="text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <span className="text-green-600 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +2.5%
              </span>
              vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Suscripciones Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <span className="text-green-600 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +12%
              </span>
              tasa de conversión
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${stats?.monthlyRevenue || 0}</div>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <span className="text-green-600 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +8.2%
              </span>
              vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Estado del Sistema</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center mt-1">
              <Badge
                variant={
                  stats?.systemHealth === 'healthy' ? 'default' :
                    stats?.systemHealth === 'warning' ? 'outline' : 'destructive'
                }
                className={cn(
                  "px-2.5 py-0.5 text-sm font-medium",
                  stats?.systemHealth === 'healthy' && "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
                  stats?.systemHealth === 'warning' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200",
                  stats?.systemHealth === 'error' && "bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                )}
              >
                {stats?.systemHealth === 'healthy' ? 'Operativo' :
                  stats?.systemHealth === 'warning' ? 'Degradado' : 'Error'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Última verificación: hace 1 min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Over Time Chart */}
      <UsersOverTimeChart />

      {/* Detailed Monitoring Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentSystemStatus />
        <SystemHealthMonitor />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UsageAnalytics />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>

      <UserSubscriptionMetrics />
    </div>
  )
}
