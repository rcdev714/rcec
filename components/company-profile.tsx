'use client';

import { useState, useEffect } from "react";
import { Company } from "@/types/company";
import { CompanyProfileHeader } from "./company-profile-header";
import { CompanyFinancialTimeline } from "./company-financial-timeline";
import dynamic from "next/dynamic";
import { Building2, DollarSign, TrendingUp, Users, Calendar, MapPin, Phone, Briefcase, Activity, BarChart3, FileText } from "lucide-react";
import Link from "next/link";

// Client-side feature access function (avoiding server imports)
function canAccessFeature(plan: 'FREE' | 'PRO' | 'ENTERPRISE', feature: string): boolean {
  const featureMap = {
    // Free features
    'basic_search': ['FREE', 'PRO', 'ENTERPRISE'],
    'basic_support': ['FREE', 'PRO', 'ENTERPRISE'],

    // Pro features
    'unlimited_search': ['PRO', 'ENTERPRISE'],
    'advanced_filtering': ['PRO', 'ENTERPRISE'],
    'export_data': ['PRO', 'ENTERPRISE'],
    'priority_support': ['PRO', 'ENTERPRISE'],
    'linkedin_search': ['PRO', 'ENTERPRISE'],

    // Enterprise features
    'custom_integrations': ['ENTERPRISE'],
    'dedicated_support': ['ENTERPRISE'],
    'advanced_analytics': ['ENTERPRISE'],
    'api_access': ['ENTERPRISE'],
  } as const;

  const allowedPlans = featureMap[feature as keyof typeof featureMap];
  return allowedPlans ? (allowedPlans as readonly string[]).includes(plan) : false;
}

// Dynamically import the charts component to avoid SSR issues with Recharts
const CompanyHistoryCharts = dynamic(() => import("./company-history-charts"), { ssr: false });

interface CompanyProfileProps {
  history: Company[];
  ruc: string;
  returnUrl?: string;
}

export default function CompanyProfile({ history, ruc, returnUrl }: CompanyProfileProps) {
  const [activeSection, setActiveSection] = useState<'metrics' | 'history' | 'analytics' | 'contacts'>('metrics');
  const [canAccessLinkedInFeature, setCanAccessLinkedInFeature] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscriptions/status');
        if (response.ok) {
          const data = await response.json();
          const plan = data.subscription?.plan || 'FREE';

          // Check LinkedIn access using centralized feature access
          const hasLinkedInAccess = canAccessFeature(plan, 'linkedin_search');
          setCanAccessLinkedInFeature(hasLinkedInAccess);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setCanAccessLinkedInFeature(false);
      }
    }
    fetchSubscription();
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-xl font-normal text-gray-900 mb-2">
              No se encontraron datos
            </h1>
            <p className="text-sm text-gray-600 mb-8">
              RUC: {ruc}
            </p>
            <Link 
              href="/companies" 
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              ← Volver a empresas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get the most recent data for header and overview
  const latestCompany = [...history].sort((a, b) => (b.anio || 0) - (a.anio || 0))[0];
  
  // Calculate growth rates
  const previousYear = history.find(c => c.anio === (latestCompany.anio! - 1));
  const calculateGrowth = (current: number | null | undefined, previous: number | null | undefined) => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(latestCompany.ingresos_ventas, previousYear?.ingresos_ventas);
  const assetsGrowth = calculateGrowth(latestCompany.activos, previousYear?.activos);
  const profitGrowth = calculateGrowth(latestCompany.utilidad_neta, previousYear?.utilidad_neta);

  const formatCompactCurrency = (value: number | null | undefined) => {
    if (!value && value !== 0) return '—';
    const num = value;
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Profile Header */}
      <CompanyProfileHeader 
        company={latestCompany}
        ruc={ruc}
        totalYears={history.length}
        canAccessLinkedIn={canAccessLinkedInFeature}
        returnUrl={returnUrl}
      />

      {/* Main Content - Dashboard Style */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Pills */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveSection('metrics')}
            className={`px-4 py-2 rounded-lg text-xs font-normal uppercase tracking-wider transition-all ${
              activeSection === 'metrics'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/50'
            }`}
          >
            Métricas
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`px-4 py-2 rounded-lg text-xs font-normal uppercase tracking-wider transition-all ${
              activeSection === 'history'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/50'
            }`}
          >
            Historia
          </button>
          <button
            onClick={() => setActiveSection('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-normal uppercase tracking-wider transition-all ${
              activeSection === 'analytics'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/50'
            }`}
          >
            Análisis
          </button>
          <button
            onClick={() => setActiveSection('contacts')}
            className={`px-4 py-2 rounded-lg text-xs font-normal uppercase tracking-wider transition-all ${
              activeSection === 'contacts'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/50'
            }`}
          >
            Contactos
          </button>
        </div>

        {/* Metrics Dashboard */}
        {activeSection === 'metrics' && (
          <div className="space-y-6">
            {/* Key Financial Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Revenue Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  {revenueGrowth !== null && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      revenueGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-normal">Ingresos</p>
                <p className="text-xl font-normal text-gray-900 font-mono mb-1">
                  {formatCompactCurrency(latestCompany.ingresos_ventas)}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {latestCompany.ingresos_ventas?.toLocaleString() || '—'}
                </p>
              </div>

              {/* Assets Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  {assetsGrowth !== null && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      assetsGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {assetsGrowth >= 0 ? '+' : ''}{assetsGrowth.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-normal">Activos</p>
                <p className="text-xl font-normal text-gray-900 font-mono mb-1">
                  {formatCompactCurrency(latestCompany.activos)}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {latestCompany.activos?.toLocaleString() || '—'}
                </p>
              </div>

              {/* Equity Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-normal">Patrimonio</p>
                <p className="text-xl font-normal text-gray-900 font-mono mb-1">
                  {formatCompactCurrency(latestCompany.patrimonio)}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {latestCompany.patrimonio?.toLocaleString() || '—'}
                </p>
              </div>

              {/* Employees Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
                    <Users className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-normal">Empleados</p>
                <p className="text-xl font-normal text-gray-900 font-mono mb-1">
                  {latestCompany.n_empleados?.toLocaleString() || '—'}
                </p>
                <p className="text-xs text-gray-400 font-normal">Personal</p>
              </div>
            </div>

            {/* Secondary Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Financial Ratios */}
              <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
                  Ratios Financieros
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {latestCompany.roe !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">ROE</p>
                      <p className="text-base font-normal text-gray-900 font-mono">
                        {latestCompany.roe?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {latestCompany.roa !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">ROA</p>
                      <p className="text-base font-normal text-gray-900 font-mono">
                        {latestCompany.roa?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {latestCompany.margen_operacional !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Margen Op.</p>
                      <p className="text-base font-normal text-gray-900 font-mono">
                        {latestCompany.margen_operacional?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {latestCompany.liquidez_corriente !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Liquidez</p>
                      <p className="text-base font-normal text-gray-900 font-mono">
                        {latestCompany.liquidez_corriente?.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {latestCompany.utilidad_neta !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Utilidad Neta</p>
                      <p className="text-base font-normal text-gray-900 font-mono">
                        {formatCompactCurrency(latestCompany.utilidad_neta)}
                      </p>
                    </div>
                  )}
                  {profitGrowth !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Crecimiento</p>
                      <p className={`text-base font-normal font-mono ${
                        profitGrowth >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {profitGrowth >= 0 ? '+' : ''}{profitGrowth.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  Información
                </h3>
                <div className="space-y-4">
                  {latestCompany.provincia && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Provincia</p>
                        <p className="text-sm font-normal text-gray-900">{latestCompany.provincia}</p>
                      </div>
                    </div>
                  )}
                  {latestCompany.tipo_empresa && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Tipo</p>
                        <p className="text-sm font-normal text-gray-900">{latestCompany.tipo_empresa}</p>
                      </div>
                    </div>
                  )}
                  {latestCompany.estado_empresa && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Estado</p>
                        <p className="text-sm font-normal text-gray-900">{latestCompany.estado_empresa}</p>
                      </div>
                    </div>
                  )}
                  {latestCompany.anio && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Año Fiscal</p>
                        <p className="text-sm font-normal text-gray-900 font-mono">{latestCompany.anio}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Additional Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  Contacto
                </h3>
                <div className="space-y-4">
                  {latestCompany.director_representante && (
                    <div>
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" />
                        Representante Legal
                      </p>
                      <p className="text-sm font-normal text-gray-900">
                        {latestCompany.director_representante}
                      </p>
                    </div>
                  )}
                  {latestCompany.director_cargo && (
                    <div>
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Cargo</p>
                      <p className="text-sm font-normal text-gray-900">
                        {latestCompany.director_cargo}
                      </p>
                    </div>
                  )}
                  {latestCompany.director_telefono && (
                    <div>
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Teléfono</p>
                      <a
                        href={`tel:${latestCompany.director_telefono}`}
                        className="text-sm font-normal text-gray-900 hover:text-gray-600 transition-colors font-mono"
                      >
                        {latestCompany.director_telefono}
                      </a>
                    </div>
                  )}
                  {!latestCompany.director_representante && 
                   !latestCompany.director_cargo && 
                   !latestCompany.director_telefono && (
                    <p className="text-xs text-gray-500 font-normal">No hay información de contacto disponible</p>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {(latestCompany.actividad_principal || latestCompany.segmento_empresa) && (
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    Detalles
                  </h3>
                  <div className="space-y-4">
                    {latestCompany.actividad_principal && (
                      <div>
                        <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Actividad Principal</p>
                        <p className="text-sm text-gray-900 font-normal">
                          {latestCompany.actividad_principal}
                        </p>
                      </div>
                    )}
                    {latestCompany.segmento_empresa && (
                      <div>
                        <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Segmento</p>
                        <p className="text-sm text-gray-900 font-normal">
                          {latestCompany.segmento_empresa}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Section */}
        {activeSection === 'history' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                Historia Financiera
              </h3>
              <p className="text-xs text-gray-400 font-normal">{history.length} años de datos registrados</p>
            </div>
            <CompanyFinancialTimeline history={history} />
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === 'analytics' && (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
            <CompanyHistoryCharts history={history} />
          </div>
        )}

        {/* Contacts Section */}
        {activeSection === 'contacts' && (
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                Información de Contacto
              </h3>
              <div className="space-y-4">
                {latestCompany.director_representante && (
                  <div>
                    <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      Representante Legal
                    </p>
                    <p className="text-sm font-normal text-gray-900">
                      {latestCompany.director_representante}
                    </p>
                  </div>
                )}
                {latestCompany.director_cargo && (
                  <div>
                    <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Cargo</p>
                    <p className="text-sm font-normal text-gray-900">
                      {latestCompany.director_cargo}
                    </p>
                  </div>
                )}
                {latestCompany.director_telefono && (
                  <div>
                    <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Teléfono</p>
                    <a
                      href={`tel:${latestCompany.director_telefono}`}
                      className="text-sm font-normal text-gray-900 hover:text-gray-600 transition-colors font-mono"
                    >
                      {latestCompany.director_telefono}
                    </a>
                  </div>
                )}
                {!latestCompany.director_representante &&
                 !latestCompany.director_cargo &&
                 !latestCompany.director_telefono && (
                  <p className="text-xs text-gray-500 font-normal">No hay información de contacto disponible</p>
                )}
              </div>
            </div>

            {/* Additional Company Info */}
            {(latestCompany.actividad_principal || latestCompany.segmento_empresa) && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg shadow-gray-900/5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  Detalles Adicionales
                </h3>
                <div className="space-y-4">
                  {latestCompany.actividad_principal && (
                    <div>
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Actividad Principal</p>
                      <p className="text-sm text-gray-900 font-normal">
                        {latestCompany.actividad_principal}
                      </p>
                    </div>
                  )}
                  {latestCompany.segmento_empresa && (
                    <div>
                      <p className="text-xs text-gray-500 font-normal uppercase tracking-wider mb-1">Segmento</p>
                      <p className="text-sm text-gray-900 font-normal">
                        {latestCompany.segmento_empresa}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

