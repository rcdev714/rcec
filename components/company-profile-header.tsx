'use client';

import { Company } from "@/types/company";
import { Building2, MapPin, Users, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CompanyProfileHeaderProps {
  company: Company;
  ruc: string;
  totalYears: number;
  returnUrl?: string;
}

export function CompanyProfileHeader({ company, ruc, totalYears, returnUrl }: CompanyProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const companyName = company.nombre_comercial || company.nombre || 'N/A';
  const initials = getInitials(companyName);

  const router = useRouter();
  const handleBack = () => {
    // If returnUrl is provided, use it to preserve filters and sorting
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
    
    // Fallback: try to use browser history if referrer is from companies page
    try {
      const ref = document.referrer;
      if (ref) {
        const url = new URL(ref);
        if (url.origin === window.location.origin && url.pathname.startsWith('/companies')) {
          router.back();
          return;
        }
      }
    } catch {}
    
    // Final fallback: go to companies page without filters
    router.push('/companies');
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
      {/* Cover Banner */}
      <div className="relative h-32 bg-gradient-to-r from-gray-50 via-gray-50/50 to-gray-50">
        <div className="absolute inset-0 bg-black/5"></div>
        
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBack}
            className="bg-white/90 hover:bg-white backdrop-blur-sm border-gray-300/50 shadow-sm hover:shadow-md transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </div>

      </div>

      {/* Profile Info Container */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative">
          {/* Avatar */}
          <div className="absolute -top-12 left-0">
            <div className="w-20 h-20 rounded-xl bg-white border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-white border border-gray-300 flex items-center justify-center">
                <span className="text-xl font-normal text-gray-700">{initials}</span>
              </div>
            </div>
          </div>

          {/* Company Name and Details */}
          <div className="pt-12 pb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Company Name */}
                <h1 className="text-lg font-normal text-gray-900 mb-1">
                  {companyName}
                </h1>
                
                {/* RUC */}
                <p className="text-xs text-gray-500 font-mono mb-4">
                  @{ruc}
                </p>

                {/* Additional Info Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {company.provincia && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100/60 rounded-md text-xs text-gray-700 border border-gray-200/50">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="font-normal">{company.provincia}</span>
                    </div>
                  )}
                  {company.tipo_empresa && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100/60 rounded-md text-xs text-gray-700 border border-gray-200/50">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span className="font-normal">{company.tipo_empresa}</span>
                    </div>
                  )}
                  {company.estado_empresa && (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
                      company.estado_empresa.toLowerCase().includes('activ') 
                        ? 'bg-gray-100/60 text-gray-700 border-gray-200/50' 
                        : 'bg-gray-100/60 text-gray-700 border-gray-200/50'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        company.estado_empresa.toLowerCase().includes('activ') 
                          ? 'bg-gray-600' 
                          : 'bg-gray-400'
                      }`}></div>
                      <span className="font-normal">{company.estado_empresa}</span>
                    </div>
                  )}
                </div>

                {/* Stats Bar */}
                <div className="flex gap-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-normal text-gray-900">{totalYears}</span>
                    <span className="text-gray-500 font-normal">
                      {totalYears === 1 ? 'año registrado' : 'años de historia'}
                    </span>
                  </div>
                  {company.n_empleados && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-normal text-gray-900">
                        {company.n_empleados.toLocaleString()}
                      </span>
                      <span className="text-gray-500 font-normal">empleados</span>
                    </div>
                  )}
                  {company.fecha_constitucion && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500 font-normal">
                        Fundada {new Date(company.fecha_constitucion).getFullYear()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

