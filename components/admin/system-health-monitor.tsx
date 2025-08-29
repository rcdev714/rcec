'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error'
  database: {
    status: 'connected' | 'disconnected' | 'slow'
    responseTime: number
  }
  apis: {
    stripe: 'operational' | 'degraded' | 'down'
    supabase: 'operational' | 'degraded' | 'down'
    gemini: 'operational' | 'degraded' | 'down'
  }
  server: {
    uptime: number
    memoryMB: number
    memoryTotalMB: number
    cpu: number
  }
  lastChecked: string
}

export default function SystemHealthMonitor() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  async function fetchSystemHealth() {
    try {
      const response = await fetch('/api/admin/system-health')
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
      }
    } catch (error) {
      console.error('Error fetching system health:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'bg-green-100 text-green-800'
      case 'warning':
      case 'slow':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
      case 'disconnected':
      case 'down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
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
        <CardTitle>System Health</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchSystemHealth}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Status:</span>
          <Badge className={getStatusColor(health?.status || 'unknown')}>
            {health?.status || 'Unknown'}
          </Badge>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Database</h4>
          <div className="pl-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Status:</span>
              <Badge 
                variant="outline" 
                className={getStatusColor(health?.database.status || 'unknown')}
              >
                {health?.database.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Response Time:</span>
              <span className="text-xs font-mono">
                {health?.database.responseTime || 0}ms
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">External APIs</h4>
          <div className="pl-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Stripe:</span>
              <Badge 
                variant="outline" 
                className={getStatusColor(health?.apis.stripe || 'unknown')}
              >
                {health?.apis.stripe || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Supabase:</span>
              <Badge 
                variant="outline" 
                className={getStatusColor(health?.apis.supabase || 'unknown')}
              >
                {health?.apis.supabase || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Gemini AI:</span>
              <Badge 
                variant="outline" 
                className={getStatusColor(health?.apis.gemini || 'unknown')}
              >
                {health?.apis.gemini || 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Server Resources</h4>
          <div className="pl-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Uptime:</span>
              <span className="text-xs font-mono">
                {health?.server.uptime ? formatUptime(health.server.uptime) : '0m'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Heap Memory:</span>
              <span className="text-xs font-mono text-blue-600">
                {health?.server.memoryMB || 0}MB / {health?.server.memoryTotalMB || 0}MB
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">CPU Usage:</span>
              <span className={`text-xs font-mono ${
                (health?.server.cpu || 0) > 80 ? 'text-red-600' : 'text-green-600'
              }`}>
                {health?.server.cpu || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Last checked: {health?.lastChecked 
            ? new Date(health.lastChecked).toLocaleString()
            : 'Never'
          }
        </div>

        {health?.status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              🚨 Critical system issues detected. Immediate attention required.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
