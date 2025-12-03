'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Server,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  HardDrive
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  async function fetchSystemHealth() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/system-health')
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
      }
    } catch (error) {
      console.error('Error fetching system health:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'warning':
      case 'slow':
      case 'degraded':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'error':
      case 'disconnected':
      case 'down':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
      case 'warning':
      case 'slow':
      case 'degraded':
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
      case 'error':
      case 'disconnected':
      case 'down':
        return <XCircle className="h-3.5 w-3.5 text-red-600" />
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-400" />
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
      <Card className="border-gray-200 shadow-sm h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Salud del Sistema
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
          <Server className="h-4 w-4 text-orange-500" />
          Salud del Sistema
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900"
          onClick={fetchSystemHealth}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
          <span className="text-sm font-medium text-gray-700">Estado General</span>
          <Badge variant="outline" className={cn("capitalize pl-1.5 pr-2.5 py-0.5", getStatusColor(health?.status || 'unknown'))}>
            <span className="mr-1.5">{getStatusIcon(health?.status || 'unknown')}</span>
            {health?.status === 'healthy' ? 'Saludable' : health?.status || 'Desconocido'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database & APIs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-3 w-3" /> Infraestructura
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Base de Datos</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{health?.database.responseTime}ms</span>
                  {getStatusIcon(health?.database.status || 'unknown')}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Stripe API</span>
                {getStatusIcon(health?.apis.stripe || 'unknown')}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Supabase API</span>
                {getStatusIcon(health?.apis.supabase || 'unknown')}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Gemini AI</span>
                {getStatusIcon(health?.apis.gemini || 'unknown')}
              </div>
            </div>
          </div>

          {/* Server Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-3 w-3" /> Recursos
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-gray-400" /> Uptime
                </span>
                <span className="font-mono text-xs text-gray-700">
                  {health?.server.uptime ? formatUptime(health.server.uptime) : '0m'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3 text-gray-400" /> Memoria
                </span>
                <span className="font-mono text-xs text-gray-700">
                  {health?.server.memoryMB || 0} / {health?.server.memoryTotalMB || 0} MB
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-gray-400" /> CPU
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", (health?.server.cpu || 0) > 80 ? "bg-red-500" : "bg-green-500")}
                      style={{ width: `${Math.min(health?.server.cpu || 0, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-gray-700 w-8 text-right">
                    {health?.server.cpu || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Última verificación</span>
            <span className="text-gray-700 font-medium">
              {health?.lastChecked
                ? new Date(health.lastChecked).toLocaleTimeString()
                : 'Nunca'
              }
            </span>
          </div>
        </div>

        {health?.status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Problemas críticos detectados. Atención inmediata requerida.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
