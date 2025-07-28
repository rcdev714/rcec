'use client';

import { useState } from "react";
import { Company } from "@/types/company";
import { CompanyCard } from "@/components/company-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

// Dynamically import the charts component to avoid SSR issues with Recharts
const CompanyHistoryCharts = dynamic(() => import("./company-history-charts"), { ssr: false });

interface CompanyHistoryCarouselProps {
  history: Company[];
  ruc: string;
}

export default function CompanyHistoryCarousel({ history, ruc }: CompanyHistoryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  console.log("CompanyHistoryCarousel received:", { history, ruc });

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-semibold text-foreground mb-4">
            No se encontraron datos para RUC: {ruc}
          </h1>
          <Link href="/companies" className="text-blue-600 hover:underline">
            ← Volver a empresas
          </Link>
        </div>
      </div>
    );
  }

  const prev = () => setCurrentIndex((i) => (i === 0 ? history.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === history.length - 1 ? 0 : i + 1));

  const company = history[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <Image src="/image.png" alt="UNIBROKERS Logo" width={120} height={36} className="h-6 w-auto" />
          </Link>
          <Link href="/companies" className="text-blue-600 hover:underline">
            ← Volver a empresas
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2 text-center md:text-left">
          Historia Financiera: {company.nombre_comercial || company.nombre} (RUC: {ruc})
        </h1>
        
        <div className="text-center md:text-left mb-8 text-sm text-muted-foreground">
          <p>Director: {company.director_representante || 'N/A'}</p>
          <p>Cargo: {company.director_cargo || 'N/A'}</p>
          <p>Teléfono: {company.director_telefono || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 items-start">
          {/* Left Column: Carousel/Card */}
          <div className="lg:col-span-2">
            {history.length > 1 ? (
              <div className="relative max-w-md mx-auto lg:max-w-none lg:mx-0">
                {/* Year indicator */}
                <div className="text-center mb-4">
                  <span className="text-sm text-muted-foreground">
                    Año {currentIndex + 1} de {history.length}
                  </span>
                </div>
                
                {/* Carousel Navigation */}
                <button onClick={prev} className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 p-2 bg-white text-black border rounded-full z-10 transition-colors hover:bg-gray-200">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={next} className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 p-2 bg-white text-black border rounded-full z-10 transition-colors hover:bg-gray-200">
                  <ChevronRight size={24} />
                </button>

                {/* Expanded Card */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-medium mb-4">Año Fiscal: {company.anio || 'No especificado'}</h2>
                  <CompanyCard company={company} />
                  
                  {/* Additional financial details */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium">Detalles Financieros Adicionales</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ingresos Ventas:</p>
                        <p className="font-medium">{company.ingresos_ventas?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Impuesto Renta:</p>
                        <p className="font-medium">{company.impuesto_renta?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Utilidad Antes Impuestos:</p>
                        <p className="font-medium">{company.utilidad_an_imp?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gastos Financieros:</p>
                        <p className="font-medium">{company.gastos_financieros?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto lg:max-w-none lg:mx-0">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-medium mb-4">Año Fiscal: {company.anio || 'No especificado'}</h2>
                  <CompanyCard company={company} />
                  
                  {/* Additional financial details for single year */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium">Detalles Financieros Adicionales</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ingresos Ventas:</p>
                        <p className="font-medium">{company.ingresos_ventas?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Impuesto Renta:</p>
                        <p className="font-medium">{company.impuesto_renta?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Utilidad Antes Impuestos:</p>
                        <p className="font-medium">{company.utilidad_an_imp?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gastos Financieros:</p>
                        <p className="font-medium">{company.gastos_financieros?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-muted-foreground text-center">
                  Solo un año disponible ({company.anio || 'año no especificado'}).
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Charts */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            <CompanyHistoryCharts history={history} />
          </div>
        </div>
      </div>
    </div>
  );
} 