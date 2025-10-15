'use client';

import { useState, useEffect } from "react";
import { Company } from "@/types/company";
import { CompanyProfileHeader } from "./company-profile-header";
import { CompanyProfileTabs } from "./company-profile-tabs";
import { CompanyCard } from "./company-card";
import { CompanyFinancialTimeline } from "./company-financial-timeline";
import { CompanyInfoSidebar } from "./company-info-sidebar";
import dynamic from "next/dynamic";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Calendar } from "lucide-react";

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
    'linkedin_search': ['FREE', 'PRO', 'ENTERPRISE'],

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
}

export default function CompanyProfile({ history, ruc }: CompanyProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              No se encontraron datos
            </h1>
            <p className="text-sm text-gray-600 mb-8">
              RUC: {ruc}
            </p>
            <Link 
              href="/companies" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

  const tabs = [
    { id: 'overview', label: 'Resumen', count: undefined },
    { id: 'history', label: 'Historia', count: history.length },
    { id: 'charts', label: 'Análisis', count: undefined },
    { id: 'contact', label: 'Contacto', count: undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <CompanyProfileHeader 
        company={latestCompany}
        ruc={ruc}
        totalYears={history.length}
        canAccessLinkedIn={canAccessLinkedInFeature}
      />

      {/* Tab Navigation */}
      <CompanyProfileTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width on desktop */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <CompanyCard company={latestCompany} variant="overview" />
                
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3">
                      Información General
                    </h4>
                    <div className="space-y-2 text-sm">
                      {latestCompany.provincia && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Provincia:</span>
                          <span className="font-medium text-gray-900">{latestCompany.provincia}</span>
                        </div>
                      )}
                      {latestCompany.tipo_empresa && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tipo:</span>
                          <span className="font-medium text-gray-900">{latestCompany.tipo_empresa}</span>
                        </div>
                      )}
                      {latestCompany.estado_empresa && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estado:</span>
                          <span className="font-medium text-gray-900">{latestCompany.estado_empresa}</span>
                        </div>
                      )}
                      {latestCompany.anio && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Último año fiscal:</span>
                          <span className="font-medium text-gray-900">{latestCompany.anio}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3">
                      Ratios Financieros
                    </h4>
                    <div className="space-y-2 text-sm">
                      {latestCompany.roe !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ROE:</span>
                          <span className="font-medium text-gray-900">
                            {latestCompany.roe?.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {latestCompany.roa !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ROA:</span>
                          <span className="font-medium text-gray-900">
                            {latestCompany.roa?.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {latestCompany.margen_operacional !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Margen Operacional:</span>
                          <span className="font-medium text-gray-900">
                            {latestCompany.margen_operacional?.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {latestCompany.liquidez_corriente !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Liquidez Corriente:</span>
                          <span className="font-medium text-gray-900">
                            {latestCompany.liquidez_corriente?.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Historia Financiera
                  </h3>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <p className="text-sm font-medium">Año Fiscal</p>
                  </div>
                </div>
                <CompanyFinancialTimeline history={history} />
              </div>
            )}

            {/* Charts Tab */}
            {activeTab === 'charts' && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <CompanyHistoryCharts history={history} />
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-6">
                    Información de Contacto
                  </h3>
                  
                  <div className="space-y-6">
                    {latestCompany.director_representante && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          Representante Legal
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {latestCompany.director_representante}
                        </p>
                      </div>
                    )}

                    {latestCompany.director_cargo && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          Cargo
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {latestCompany.director_cargo}
                        </p>
                      </div>
                    )}

                    {latestCompany.director_telefono && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          Teléfono de Contacto
                        </p>
                        <a
                          href={`tel:${latestCompany.director_telefono}`}
                          className="text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {latestCompany.director_telefono}
                        </a>
                      </div>
                    )}

                    {!latestCompany.director_representante && 
                     !latestCompany.director_cargo && 
                     !latestCompany.director_telefono && (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          No hay información de contacto disponible para esta empresa
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Company Info */}
                {(latestCompany.actividad_principal || latestCompany.segmento_empresa) && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-6">
                      Detalles Adicionales
                    </h3>
                    
                    <div className="space-y-4">
                      {latestCompany.actividad_principal && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">
                            Actividad Principal
                          </p>
                          <p className="text-sm text-gray-900">
                            {latestCompany.actividad_principal}
                          </p>
                        </div>
                      )}

                      {latestCompany.segmento_empresa && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">
                            Segmento Empresarial
                          </p>
                          <p className="text-sm text-gray-900">
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

          {/* Right Sidebar - 1/3 width on desktop */}
          <div className="lg:col-span-1">
            <CompanyInfoSidebar company={latestCompany} />
          </div>
        </div>
      </div>
    </div>
  );
}

