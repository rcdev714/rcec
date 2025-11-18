'use client';

import { useState } from 'react';
import PlanAndSubscriptionCard from "@/components/plan-subscription-card";
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
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-xs text-gray-600">
            Monitorea tu uso mensual de búsquedas y conversaciones con el Agente. Gestiona tu suscripción y analiza tu actividad.
          </p>
        </div>
        
        {/* Toggle Tabs */}
        <div className="flex justify-center mb-8">
          <div className="relative flex items-center p-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200/50 shadow-sm backdrop-blur-sm min-h-[36px]">
            {/* Sliding indicator */}
            <div
              className={`absolute top-1 bottom-1 bg-white rounded-md shadow-sm border border-gray-100 transition-all duration-300 ease-out ${
                activeTab === 'analytics'
                  ? 'left-1 right-[calc(50%+1px)]'
                  : 'left-[calc(50%+1px)] right-1'
              }`}
            />

            <button
              onClick={() => setActiveTab('analytics')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-300 ease-out min-w-0 flex-1 ${
                activeTab === 'analytics'
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Analíticas</span>
              <span className="sm:hidden whitespace-nowrap">Analíticas</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-300 ease-out min-w-0 flex-1 ${
                activeTab === 'logs'
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Registros Agente</span>
              <span className="sm:hidden whitespace-nowrap">Registros</span>
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

        {/* Plan y Subscripcion */}
        <div className="mb-8">
          <PlanAndSubscriptionCard />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3 mb-8">
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
    </div>
  );
}
