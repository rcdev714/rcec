'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  UserPlus,
  CreditCard,
  DollarSign,
  Download,
  AlertTriangle,
  Activity,
  Webhook,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'signup' | 'subscription' | 'payment' | 'export' | 'error' | 'webhook' | 'system'
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
    const interval = setInterval(fetchRecentActivity, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  async function fetchRecentActivity() {
    try {
      const response = await fetch('/api/admin/recent-activity')
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="h-4 w-4 text-green-600" />
      case 'subscription':
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case 'payment':
        return <DollarSign className="h-4 w-4 text-purple-600" />
      case 'export':
        return <Download className="h-4 w-4 text-orange-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'webhook':
        return <Webhook className="h-4 w-4 text-indigo-600" />
      case 'system':
        return <Activity className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'signup':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'subscription':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'payment':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'export':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'webhook':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Justo ahora'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`
    return `Hace ${Math.floor(diffInMinutes / 1440)}d`
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay actividad reciente</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 group">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
                  getActivityColor(activity.type).replace('text-', 'bg-opacity-20 border-opacity-40 ')
                )}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate pr-2">
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-snug line-clamp-2">
                    {activity.message}
                  </p>
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(activity.metadata).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
