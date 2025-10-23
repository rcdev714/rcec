'use client';

import { useState } from 'react';
import SubscriptionStatus from "@/components/subscription-status";
import PlanCard from "@/components/dashboard/plan-card";
import AnalyticsCard from "@/components/dashboard/analytics-card";
import AnalyticsChartsCard from "@/components/dashboard/analytics-charts-card";
import AgentLogsCard from "@/components/dashboard/agent-logs-card";
import Link from "next/link";
import { FileText, Infinity, Building, Package, CreditCard, Settings, CheckCircle, Activity, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs'>('analytics');
  
  // Show success message if redirected from successful checkout
  const showSuccessMessage = false; // Handled client-side now

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Success Message Banner */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-900">
                ¡Suscripción activada exitosamente!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Tu plan ha sido actualizado. Ya puedes disfrutar de todas las funciones premium.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div className="text-left">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-xs text-gray-600">
              Monitorea tu uso mensual de búsquedas, conversaciones Agentes y exportaciones. Gestiona tu suscripción y analiza tu actividad.
            </p>
          </div>
        </div>
        
        {/* Toggle Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Analíticas
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Registros Agente
            </button>
          </div>
        </div>

        {/* Analytics/Logs Content */}
        <div className="space-y-6 mb-8">
          {activeTab === 'analytics' ? (
            <>
              <AnalyticsCard />
              <AnalyticsChartsCard />
            </>
          ) : (
            <AgentLogsCard />
          )}
        </div>

        {/* Subscription Status & Quick Links Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {/* Quick links */}
            <div className="grid grid-cols-3 gap-3">
              <Link href="/docs" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50 transition-colors">
                <FileText size={18} />
                <span className="text-xs">Docs</span>
              </Link>
              <Link href="/chat" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50 transition-colors">
                <Infinity size={18} />
                <span className="text-xs">Agente</span>
              </Link>
              <Link href="/companies" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50 transition-colors">
                <Building size={18} />
                <span className="text-xs">Empresas</span>
              </Link>
              <Link href="/offerings" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50 transition-colors">
                <Package size={18} />
                <span className="text-xs">Servicios</span>
              </Link>
              <Link href="/pricing" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50 transition-colors">
                <CreditCard size={18} />
                <span className="text-xs">Suscripción</span>
              </Link>
              <Link href="/settings" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50 transition-colors">
                <Settings size={18} />
                <span className="text-xs">Configuración</span>
              </Link>
            </div>
          </div>
          
          <div>
            <SubscriptionStatus />
          </div>
        </div>

        {/* Plan Card at Bottom */}
        <PlanCard />
      </div>
    </div>
  );
}
