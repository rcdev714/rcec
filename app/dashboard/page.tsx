'use client';

import { useState } from 'react';
import PlanAndSubscriptionCard from "@/components/plan-subscription-card";
import AnalyticsCard from "@/components/dashboard/analytics-card";
import AnalyticsChartsCard from "@/components/dashboard/analytics-charts-card";
import AgentLogsCard from "@/components/dashboard/agent-logs-card";
import PricingUpsell from "@/components/dashboard/pricing-upsell";
import Link from "next/link";
import { FileText, Infinity, Building, Package, CreditCard, Settings, TrendingUp, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs'>('analytics');

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 p-4 sm:p-8 font-inter selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1 font-light">
              Vista general de tu actividad y consumo.
            </p>
          </div>
        </div>

        <PricingUpsell />

        {/* Modern Tab Switcher */}
        <div id="dashboard-tab-switcher" className="bg-white border border-gray-200 rounded-lg p-1 flex items-center shadow-sm w-fit mx-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`relative px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'analytics' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === 'analytics' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gray-100 rounded-md -z-10"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Analíticas
            </span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`relative px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'logs' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === 'logs' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gray-100 rounded-md -z-10"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Registros
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {activeTab === 'analytics' ? (
                <>
                  <AnalyticsCard />
                  <AnalyticsChartsCard />
                </>
              ) : (
                <AgentLogsCard />
              )}
            </motion.div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="sticky top-8 space-y-6">
              <PlanAndSubscriptionCard />
              
              {/* Quick Actions */}
              <div id="dashboard-quick-actions" className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-2 gap-3">
                  <QuickLink href="/chat" icon={<Infinity size={18} />} label="Agente" />
                  <QuickLink href="/companies" icon={<Building size={18} />} label="Empresas" />
                  <QuickLink href="/offerings" icon={<Package size={18} />} label="Servicios" />
                  <QuickLink href="/docs" icon={<FileText size={18} />} label="Docs" />
                  <QuickLink href="/pricing" icon={<CreditCard size={18} />} label="Planes" />
                  <QuickLink href="/settings" icon={<Settings size={18} />} label="Ajustes" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link 
      href={href} 
      className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all text-gray-600 group bg-gray-50/30"
    >
      <div className="text-gray-400 group-hover:text-indigo-500 transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
