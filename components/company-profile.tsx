'use client';

import { useState, useEffect } from "react";
import { Company } from "@/types/company";
import { CompanyProfileHeader } from "./company-profile-header";
import { CompanyFinancialTimeline } from "./company-financial-timeline";
import dynamic from "next/dynamic";
import { Building2, DollarSign, TrendingUp, Users, Calendar, Phone, BarChart3, FileText, LinkedinIcon, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);

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
  const sortedHistory = [...history].sort((a, b) => (b.anio || 0) - (a.anio || 0));
  const latestCompany = sortedHistory[0];
  const latestDescription = sortedHistory.find(c => (c.descripcion || '').trim().length > 0)?.descripcion?.trim() || null;
  
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

  const renderLinkedInButton = (contactName: string) => {
    if (!contactName) return null;

    const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(contactName)}`;

    return canAccessLinkedInFeature ? (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex"
      >
        <Button
          size="sm"
          type="button"
          className="h-7 px-2 text-xs bg-gray-900 hover:bg-gray-800 text-white"
        >
          <LinkedinIcon className="h-3.5 w-3.5 mr-1" />
         Buscar en LinkedIn
        </Button>
      </a>
    ) : (
      <Button
        size="sm"
        type="button"
        onClick={() => setShowLinkedInModal(true)}
        className="h-7 px-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
      >
        <Lock className="h-3.5 w-3.5 mr-1" />
        LinkedIn
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <CompanyProfileHeader 
        company={latestCompany}
        ruc={ruc}
        totalYears={history.length}
        returnUrl={returnUrl}
      />

      {/* Main Content - Dashboard Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation Pills */}
        <div className="flex flex-wrap gap-1 mb-12">
          <button
            onClick={() => setActiveSection('metrics')}
            className={`px-5 py-2.5 rounded-md text-sm font-normal transition-colors ${
              activeSection === 'metrics'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Métricas
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`px-5 py-2.5 rounded-md text-sm font-normal transition-colors ${
              activeSection === 'history'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Historia
          </button>
          <button
            onClick={() => setActiveSection('analytics')}
            className={`px-5 py-2.5 rounded-md text-sm font-normal transition-colors ${
              activeSection === 'analytics'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Análisis
          </button>
          <button
            onClick={() => setActiveSection('contacts')}
            className={`px-5 py-2.5 rounded-md text-sm font-normal transition-colors ${
              activeSection === 'contacts'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Contactos
          </button>
        </div>

        {/* Metrics Dashboard */}
        {activeSection === 'metrics' && (
          <div className="space-y-8">
            {/* Key Financial Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Revenue Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-start justify-between mb-6">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  {revenueGrowth !== null && (
                    <span className={`text-xs font-medium px-2 py-1 ${
                      revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">Ingresos</p>
                <p className="text-2xl font-light text-gray-900 mb-1">
                  {formatCompactCurrency(latestCompany.ingresos_ventas)}
                </p>
                <p className="text-xs text-gray-400">
                  {latestCompany.ingresos_ventas?.toLocaleString() || '—'}
                </p>
              </div>

              {/* Assets Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-start justify-between mb-6">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  {assetsGrowth !== null && (
                    <span className={`text-xs font-medium px-2 py-1 ${
                      assetsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {assetsGrowth >= 0 ? '+' : ''}{assetsGrowth.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">Activos</p>
                <p className="text-2xl font-light text-gray-900 mb-1">
                  {formatCompactCurrency(latestCompany.activos)}
                </p>
                <p className="text-xs text-gray-400">
                  {latestCompany.activos?.toLocaleString() || '—'}
                </p>
              </div>

              {/* Equity Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-start justify-between mb-6">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">Patrimonio</p>
                <p className="text-2xl font-light text-gray-900 mb-1">
                  {formatCompactCurrency(latestCompany.patrimonio)}
                </p>
                <p className="text-xs text-gray-400">
                  {latestCompany.patrimonio?.toLocaleString() || '—'}
                </p>
              </div>

              {/* Employees Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-start justify-between mb-6">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">Empleados</p>
                <p className="text-2xl font-light text-gray-900 mb-1">
                  {latestCompany.n_empleados?.toLocaleString() || '—'}
                </p>
                <p className="text-xs text-gray-400">Personal</p>
              </div>
            </div>

            {/* Secondary Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Financial Ratios */}
              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-center gap-2 mb-8">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">Ratios Financieros</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {latestCompany.roe !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ROE</p>
                      <p className="text-lg font-light text-gray-900">
                        {latestCompany.roe?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {latestCompany.roa !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ROA</p>
                      <p className="text-lg font-light text-gray-900">
                        {latestCompany.roa?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {latestCompany.margen_operacional !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Margen Operacional</p>
                      <p className="text-lg font-light text-gray-900">
                        {latestCompany.margen_operacional?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {latestCompany.liquidez_corriente !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Liquidez</p>
                      <p className="text-lg font-light text-gray-900">
                        {latestCompany.liquidez_corriente?.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {latestCompany.utilidad_neta !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Utilidad Neta</p>
                      <p className="text-lg font-light text-gray-900">
                        {formatCompactCurrency(latestCompany.utilidad_neta)}
                      </p>
                    </div>
                  )}
                  {profitGrowth !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Crecimiento</p>
                      <p className={`text-lg font-light ${
                        profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {profitGrowth >= 0 ? '+' : ''}{profitGrowth.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-center gap-2 mb-8">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">Información</h3>
                </div>
                <div className="space-y-6">
                  {latestCompany.provincia && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Provincia</p>
                      <p className="text-sm font-light text-gray-900">{latestCompany.provincia}</p>
                    </div>
                  )}
                  {latestCompany.tipo_empresa && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tipo</p>
                      <p className="text-sm font-light text-gray-900">{latestCompany.tipo_empresa}</p>
                    </div>
                  )}
                  {latestCompany.estado_empresa && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Estado</p>
                      <p className="text-sm font-light text-gray-900">{latestCompany.estado_empresa}</p>
                    </div>
                  )}
                  {latestCompany.anio && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Año Fiscal</p>
                      <p className="text-sm font-light text-gray-900">{latestCompany.anio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Additional Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-center gap-2 mb-8">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">Contacto</h3>
                </div>
                <div className="space-y-6">
                  {latestCompany.director_representante && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Representante Legal</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-light text-gray-900">
                          {latestCompany.director_representante}
                        </p>
                        {renderLinkedInButton(latestCompany.director_representante)}
                      </div>
                    </div>
                  )}
                  {latestCompany.director_cargo && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cargo</p>
                      <p className="text-sm font-light text-gray-900">
                        {latestCompany.director_cargo}
                      </p>
                    </div>
                  )}
                  {latestCompany.director_telefono && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                      <a
                        href={`tel:${latestCompany.director_telefono}`}
                        className="text-sm font-light text-gray-900 hover:text-gray-600 transition-colors"
                      >
                        {latestCompany.director_telefono}
                      </a>
                    </div>
                  )}
                  {!latestCompany.director_representante && 
                   !latestCompany.director_cargo && 
                   !latestCompany.director_telefono && (
                    <p className="text-xs text-gray-400">No hay información de contacto disponible</p>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {(latestDescription || latestCompany.actividad_principal || latestCompany.segmento_empresa) && (
                <div className="bg-white border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center gap-2 mb-8">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-900">Detalles</h3>
                  </div>
                  <div className="space-y-6">
                    {latestDescription && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Descripción</p>
                        <p className="text-sm font-light text-gray-900 whitespace-pre-line">
                          {latestDescription}
                        </p>
                      </div>
                    )}
                    {latestCompany.actividad_principal && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Actividad Principal</p>
                        <p className="text-sm font-light text-gray-900">
                          {latestCompany.actividad_principal}
                        </p>
                      </div>
                    )}
                    {latestCompany.segmento_empresa && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Segmento</p>
                        <p className="text-sm font-light text-gray-900">
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
          <div className="space-y-8">
            <div className="bg-white border border-gray-100 rounded-lg p-8">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900">Historia Financiera</h3>
              </div>
              <p className="text-xs text-gray-400">{history.length} años de datos registrados</p>
            </div>
            <CompanyFinancialTimeline history={history} />
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === 'analytics' && (
          <div className="bg-white border border-gray-100 rounded-lg p-8">
            <CompanyHistoryCharts history={history} />
          </div>
        )}

        {/* Contacts Section */}
        {activeSection === 'contacts' && (
          <div className="space-y-8">
            {/* Contact Card */}
            <div className="bg-white border border-gray-100 rounded-lg p-8">
              <div className="flex items-center gap-2 mb-8">
                <Phone className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900">Información de Contacto</h3>
              </div>
              <div className="space-y-6">
                {latestCompany.director_representante && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Representante Legal</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-light text-gray-900">
                        {latestCompany.director_representante}
                      </p>
                      {renderLinkedInButton(latestCompany.director_representante)}
                    </div>
                  </div>
                )}
                {latestCompany.director_cargo && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cargo</p>
                    <p className="text-sm font-light text-gray-900">
                      {latestCompany.director_cargo}
                    </p>
                  </div>
                )}
                {latestCompany.director_telefono && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                    <a
                      href={`tel:${latestCompany.director_telefono}`}
                      className="text-sm font-light text-gray-900 hover:text-gray-600 transition-colors"
                    >
                      {latestCompany.director_telefono}
                    </a>
                  </div>
                )}
                {!latestCompany.director_representante &&
                 !latestCompany.director_cargo &&
                 !latestCompany.director_telefono && (
                  <p className="text-xs text-gray-400">No hay información de contacto disponible</p>
                )}
              </div>
            </div>

            {/* Additional Company Info */}
            {(latestDescription || latestCompany.actividad_principal || latestCompany.segmento_empresa) && (
              <div className="bg-white border border-gray-100 rounded-lg p-8">
                <div className="flex items-center gap-2 mb-8">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">Detalles Adicionales</h3>
                </div>
                <div className="space-y-6">
                  {latestDescription && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Descripción</p>
                      <p className="text-sm font-light text-gray-900 whitespace-pre-line">
                        {latestDescription}
                      </p>
                    </div>
                  )}
                  {latestCompany.actividad_principal && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Actividad Principal</p>
                      <p className="text-sm font-light text-gray-900">
                        {latestCompany.actividad_principal}
                      </p>
                    </div>
                  )}
                  {latestCompany.segmento_empresa && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Segmento</p>
                      <p className="text-sm font-light text-gray-900">
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
      
      {/* LinkedIn access modal for gated users */}
      <Dialog open={showLinkedInModal} onOpenChange={setShowLinkedInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Búsqueda LinkedIn - Función Pro
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            La búsqueda de contactos en LinkedIn está disponible exclusivamente para usuarios con plan Pro o Enterprise.
          </p>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                ¿Qué obtienes con Pro?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Búsqueda ilimitada en LinkedIn</li>
                <li>Búsquedas de empresas ilimitadas</li>
                <li>100 prompts del agente por mes</li>
                <li>Acceso a modelos avanzados de razonamiento</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => (window.location.href = '/pricing')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Ver Planes
              </Button>
              <Button
                onClick={() => setShowLinkedInModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

