'use client';

import { useState } from "react";
import { Company } from "@/types/company";
import { Building2, MapPin, Users, Calendar, ArrowLeft, LinkedinIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CompanyProfileHeaderProps {
  company: Company;
  ruc: string;
  totalYears: number;
  canAccessLinkedIn: boolean;
}

export function CompanyProfileHeader({ company, ruc, totalYears, canAccessLinkedIn }: CompanyProfileHeaderProps) {
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  
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
    router.push('/companies');
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Cover Banner */}
      <div className="relative h-48 bg-gradient-to-r from-indigo-600 to-indigo-200">
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10 px-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBack}
            className="bg-white/95 hover:bg-white backdrop-blur-sm border-white/20 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {company.director_representante && (
            canAccessLinkedIn ? (
              <a
                href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(company.director_representante)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  <LinkedinIcon className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
              </a>
            ) : (
              <Button 
                size="sm"
                onClick={() => setShowLinkedInModal(true)}
                className="bg-gray-400 hover:bg-gray-500 text-white shadow-lg"
              >
                <Lock className="h-4 w-4 mr-2" />
                <LinkedinIcon className="h-4 w-4 mr-1" />
                LinkedIn
              </Button>
            )
          )}
        </div>
      </div>

      {/* Profile Info Container */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative">
          {/* Avatar */}
          <div className="absolute -top-16 left-0">
            <div className="w-32 h-32 rounded-full bg-white border-2 border-white shadow-xl flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-3xl font-medium text-white">{initials}</span>
              </div>
            </div>
          </div>

          {/* Company Name and Details */}
          <div className="pt-20 pb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Company Name */}
                <h1 className="text-xl font-medium text-gray-900 mb-2">
                  {companyName}
                </h1>
                
                {/* RUC - Like Twitter handle */}
                <p className="text-sm text-gray-600 font-medium mb-3">
                  @{ruc}
                </p>

                {/* Additional Info Badges */}
                <div className="flex flex-wrap gap-3 mb-4">
                  {company.provincia && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                      <MapPin className="h-4 w-4" />
                      <span>{company.provincia}</span>
                    </div>
                  )}
                  {company.tipo_empresa && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-sm text-blue-700">
                      <Building2 className="h-4 w-4" />
                      <span>{company.tipo_empresa}</span>
                    </div>
                  )}
                  {company.estado_empresa && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                      company.estado_empresa.toLowerCase().includes('activ') 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${
                        company.estado_empresa.toLowerCase().includes('activ') 
                          ? 'bg-green-500' 
                          : 'bg-gray-500'
                      }`}></div>
                      <span>{company.estado_empresa}</span>
                    </div>
                  )}
                </div>

                {/* Stats Bar - Like follower count */}
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{totalYears}</span>
                    <span className="text-gray-600">
                      {totalYears === 1 ? 'año registrado' : 'años de historia'}
                    </span>
                  </div>
                  {company.n_empleados && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {company.n_empleados.toLocaleString()}
                      </span>
                      <span className="text-gray-600">empleados</span>
                    </div>
                  )}
                  {company.fecha_constitucion && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
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

      {/* LinkedIn Blocked Modal */}
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
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
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
                onClick={() => window.location.href = '/pricing'}
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

