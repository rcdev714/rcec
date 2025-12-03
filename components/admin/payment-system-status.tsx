'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  DollarSign,
  TrendingDown,
  Webhook
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentMetrics {
  stripeStatus: 'operational' | 'degraded' | 'down'
  recentTransactions: number
  failedPayments: number
  activeWebhooks: number
  lastWebhookReceived: string | null
  monthlyRevenue: number
  churnRate: number
}

export default function PaymentSystemStatus() {
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchPaymentMetrics()
    const interval = setInterval(fetchPaymentMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchPaymentMetrics() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/payment-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching payment metrics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'degraded':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'down':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Sistema de Pagos
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

  return (
    <Card className="border-gray-200 shadow-sm h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-indigo-500" />
          Sistema de Pagos
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900"
          onClick={fetchPaymentMetrics}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stripe Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-md border border-gray-200 shadow-sm">
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Estado de Stripe</span>
          </div>
          <Badge variant="outline" className={cn("capitalize pl-1.5 pr-2.5 py-0.5", getStatusColor(metrics?.stripeStatus || 'unknown'))}>
            <span className="mr-1.5">{getStatusIcon(metrics?.stripeStatus || 'unknown')}</span>
            {metrics?.stripeStatus || 'Unknown'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Transacciones (24h)
            </p>
            <p className="text-lg font-semibold text-gray-900">{metrics?.recentTransactions || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Pagos Fallidos
            </p>
            <p className={cn("text-lg font-semibold", (metrics?.failedPayments || 0) > 0 ? "text-red-600" : "text-green-600")}>
              {metrics?.failedPayments || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Webhook className="h-3 w-3" /> Webhooks Activos
            </p>
            <p className="text-lg font-semibold text-gray-900">{metrics?.activeWebhooks || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Tasa de Abandono
            </p>
            <p className={cn("text-lg font-semibold", (metrics?.churnRate || 0) > 5 ? "text-red-600" : "text-green-600")}>
              {metrics?.churnRate?.toFixed(1) || '0.0'}%
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Último webhook recibido</span>
            <span className="text-gray-700 font-medium">
              {metrics?.lastWebhookReceived
                ? new Date(metrics.lastWebhookReceived).toLocaleString()
                : 'Nunca'
              }
            </span>
          </div>
        </div>

        {(metrics?.failedPayments || 0) > 10 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Alto número de pagos fallidos detectado. Por favor investiga.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
