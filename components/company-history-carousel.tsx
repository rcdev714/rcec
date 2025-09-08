'use client';

import { useState, useEffect } from "react";
import { Company } from "@/types/company";
import { CompanyCard } from "@/components/company-card";
import { ChevronLeft, ChevronRight, LinkedinIcon, Building2, User, Phone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
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

interface CompanyHistoryCarouselProps {
  history: Company[];
  ruc: string;
}

export default function CompanyHistoryCarousel({ history, ruc }: CompanyHistoryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
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

  console.log("CompanyHistoryCarousel received:", { history, ruc });

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              No se encontraron datos
            </h1>
            <p className="text-xl text-gray-600 mb-8">
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

  const prev = () => setCurrentIndex((i) => (i === 0 ? history.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === history.length - 1 ? 0 : i + 1));

  const company = history[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Link href="/" className="inline-block">
              <Image 
                src="/image.png" 
                alt="UNIBROKERS Logo" 
                width={140} 
                height={42} 
                className="h-8 w-auto" 
              />
            </Link>
            <Link 
              href="/companies" 
              className="inline-flex items-center text-white hover:text-blue-700 font-medium transition-colors"
            >
              ← Volver a empresas
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {company.nombre_comercial || company.nombre}
                </h1>
                <p className="text-gray-600 font-medium">RUC: {ruc}</p>
                <p className="text-sm text-gray-500 mt-1">Historia Financiera</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Layout with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Datos de Contacto</h2>
                </div>
                {company.director_representante && (
                  <div className="relative group">
                    {canAccessLinkedInFeature ? (
                      <a
                        href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(company.director_representante)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <span className="!text-white">Buscar</span>
                        <LinkedinIcon className="h-3 w-3 !text-white" />
                      </a>
                    ) : (
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <span className="!text-white">Buscar</span>
                        <LinkedinIcon className="h-3 w-3 !text-white" />
                      </Link>
                    )}

                    {/* Tooltip */}
                    {!canAccessLinkedInFeature && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-white text-gray-900 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg border border-gray-200">
                        Actualizar plan para desbloquear
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Contact Person */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Persona</p>
                  <p className="text-base font-medium text-gray-900">
                    {company.director_representante || 'No especificado'}
                  </p>
                </div>

                {/* Position */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Cargo</p>
                  <p className="text-base text-gray-900">
                    {company.director_cargo || 'No especificado'}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-500">Teléfono Empresa</p>
                  </div>
                  <p className="text-base text-gray-900">
                    {company.director_telefono || 'No especificado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              {/* Financial Data - Full Width */}
              <div>
                {history.length > 1 ? (
                  <div className="relative">
                    {/* Year Navigation */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                        <span className="text-sm font-medium text-gray-600">
                          Año {currentIndex + 1} de {history.length}
                        </span>
                      </div>
                    </div>
                    
                    {/* Carousel Navigation */}
                    <button 
                      onClick={prev} 
                      className="absolute -left-4 top-1/2 -translate-y-1/2 p-3 bg-white text-gray-700 border border-gray-200 rounded-full shadow-md z-10 hover:bg-gray-50 hover:shadow-lg transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={next} 
                      className="absolute -right-4 top-1/2 -translate-y-1/2 p-3 bg-white text-gray-700 border border-gray-200 rounded-full shadow-md z-10 hover:bg-gray-50 hover:shadow-lg transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>

                    {/* Financial Data Card */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Año Fiscal: {company.anio || 'No especificado'}
                        </h2>
                      </div>
                      
                      <CompanyCard company={company} />
                      
                      {/* Additional Financial Details */}
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles Financieros Adicionales</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Ingresos Ventas</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.ingresos_ventas?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Impuesto Renta</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.impuesto_renta?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Utilidad Antes Impuestos</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.utilidad_an_imp?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Gastos Financieros</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.gastos_financieros?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Año Fiscal: {company.anio || 'No especificado'}
                        </h2>
                      </div>
                      
                      <CompanyCard company={company} />
                      
                      {/* Additional Financial Details */}
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles Financieros Adicionales</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Ingresos Ventas</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.ingresos_ventas?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Impuesto Renta</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.impuesto_renta?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Utilidad Antes Impuestos</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.utilidad_an_imp?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Gastos Financieros</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${company.gastos_financieros?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        <span className="text-sm text-amber-800">
                          Solo un año disponible ({company.anio || 'año no especificado'})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Charts - Full Width */}
              <div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <CompanyHistoryCharts history={history} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 