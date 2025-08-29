'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

  useEffect(() => {
    fetchSubscriptionMetrics()
  }, [])

  async function fetchSubscriptionMetrics() {
    try {
      const response = await fetch('/api/admin/subscription-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching subscription metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800'
      case 'PRO':
        return 'bg-blue-100 text-blue-800'
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User & Subscription Metrics</CardTitle>
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

  const totalPaidUsers = (metrics?.planDistribution.PRO || 0) + (metrics?.planDistribution.ENTERPRISE || 0)
  const conversionRate = metrics?.totalUsers ? (totalPaidUsers / metrics.totalUsers) * 100 : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User & Subscription Metrics</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchSubscriptionMetrics}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{metrics?.totalUsers || 0}</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">${metrics?.mrr || 0}</p>
            <p className="text-sm text-gray-600">MRR</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{conversionRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${
              (metrics?.churnRate || 0) > 5 ? 'text-red-600' : 'text-green-600'
            }`}>
              {metrics?.churnRate?.toFixed(1) || '0.0'}%
            </p>
            <p className="text-sm text-gray-600">Churn Rate</p>
          </div>
        </div>

        {/* Plan Distribution */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Plan Distribution</h4>
          <div className="space-y-3">
            {Object.entries(metrics?.planDistribution || {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getPlanColor(plan)}>{plan}</Badge>
                  <span className="text-sm">{count} users</span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${metrics?.totalUsers ? (count / metrics.totalUsers) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Recent Activity (30 days)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{metrics?.recentSignups || 0}</p>
              <p className="text-sm text-green-700">New Signups</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{metrics?.recentUpgrades || 0}</p>
              <p className="text-sm text-blue-700">Upgrades</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xl font-bold text-red-600">{metrics?.recentCancellations || 0}</p>
              <p className="text-sm text-red-700">Cancellations</p>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Top Users by Revenue</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Plan</th>
                  <th className="text-right py-2">Searches</th>
                  <th className="text-right py-2">Exports</th>
                  <th className="text-right py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.topUsers?.slice(0, 5).map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{user.email}</div>
                    </td>
                    <td className="py-2">
                      <Badge className={getPlanColor(user.plan)} variant="outline">
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="text-right py-2">{user.usage.searches}</td>
                    <td className="text-right py-2">{user.usage.exports}</td>
                    <td className="text-right py-2 font-medium">${user.revenue}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        {(metrics?.churnRate || 0) > 10 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ High churn rate detected ({metrics?.churnRate?.toFixed(1)}%). Consider improving user retention strategies.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
