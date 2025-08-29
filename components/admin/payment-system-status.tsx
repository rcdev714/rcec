'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

  useEffect(() => {
    fetchPaymentMetrics()
    const interval = setInterval(fetchPaymentMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchPaymentMetrics() {
    try {
      const response = await fetch('/api/admin/payment-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching payment metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payment System Status</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchPaymentMetrics}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Stripe Status:</span>
          <Badge className={getStatusColor(metrics?.stripeStatus || 'unknown')}>
            {metrics?.stripeStatus || 'Unknown'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Recent Transactions (24h):</span>
          <span className="text-sm font-semibold">{metrics?.recentTransactions || 0}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Failed Payments (24h):</span>
          <span className={`text-sm font-semibold ${
            (metrics?.failedPayments || 0) > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {metrics?.failedPayments || 0}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Active Webhooks:</span>
          <span className="text-sm font-semibold">{metrics?.activeWebhooks || 0}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Webhook:</span>
          <span className="text-xs text-gray-600">
            {metrics?.lastWebhookReceived 
              ? new Date(metrics.lastWebhookReceived).toLocaleString()
              : 'Never'
            }
          </span>
        </div>

        <hr className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Monthly Revenue</p>
            <p className="text-lg font-semibold text-green-600">
              ${metrics?.monthlyRevenue?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Churn Rate</p>
            <p className={`text-lg font-semibold ${
              (metrics?.churnRate || 0) > 5 ? 'text-red-600' : 'text-green-600'
            }`}>
              {metrics?.churnRate?.toFixed(1) || '0.0'}%
            </p>
          </div>
        </div>

        {(metrics?.failedPayments || 0) > 10 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ High number of failed payments detected. Please investigate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
