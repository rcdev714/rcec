'use client';

import { Company } from "@/types/company";
import { User, Phone, Briefcase, Building2, DollarSign, TrendingUp } from "lucide-react";

interface CompanyInfoSidebarProps {
  company: Company;
}

export function CompanyInfoSidebar({ company }: CompanyInfoSidebarProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Contact Info Card */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5 shadow-lg shadow-gray-900/5 sticky top-24">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-gray-400" />
          Información de Contacto
        </h3>
        
        <div className="space-y-4">
          {/* Representative */}
          {company.director_representante && (
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-normal">Representante</p>
              <p className="text-sm font-normal text-gray-900">
                {company.director_representante}
              </p>
            </div>
          )}

          {/* Position */}
          {company.director_cargo && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 uppercase tracking-wider font-normal">
                <Briefcase className="h-3 w-3 text-gray-400" />
                Cargo
              </p>
              <p className="text-sm font-normal text-gray-900">
                {company.director_cargo}
              </p>
            </div>
          )}

          {/* Phone */}
          {company.director_telefono && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 uppercase tracking-wider font-normal">
                <Phone className="h-3 w-3 text-gray-400" />
                Teléfono
              </p>
              <a 
                href={`tel:${company.director_telefono}`}
                className="text-sm font-normal text-gray-900 hover:text-gray-600 transition-colors font-mono"
              >
                {company.director_telefono}
              </a>
            </div>
          )}

          {!company.director_representante && !company.director_cargo && !company.director_telefono && (
            <p className="text-xs text-gray-500 font-normal">No hay información de contacto disponible</p>
          )}
        </div>
      </div>

      {/* Quick Stats Card */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5 shadow-lg shadow-gray-900/5">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
          Resumen Financiero
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Activos</p>
              <p className="text-sm font-normal text-gray-900 font-mono">
                {formatCurrency(company.activos)}
              </p>
            </div>
            <div className="p-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 font-normal uppercase tracking-wider">Patrimonio</p>
              <p className="text-sm font-normal text-gray-900 font-mono">
                {formatCurrency(company.patrimonio)}
              </p>
            </div>
            <div className="p-2 bg-gray-100/60 rounded-lg border border-gray-200/50">
              <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100/50">
            <p className="text-xs text-gray-500 mb-1 font-normal uppercase tracking-wider">Ingresos por Ventas</p>
            <p className="text-base font-normal text-gray-900 font-mono">
              {formatCurrency(company.ingresos_ventas)}
            </p>
          </div>
        </div>
      </div>

      {/* Company Details Card */}
      {(company.actividad_principal || company.segmento_empresa) && (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5 shadow-lg shadow-gray-900/5">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
            Detalles de la Empresa
          </h3>
          
          <div className="space-y-3 text-sm">
            {company.actividad_principal && (
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-normal">Actividad Principal</p>
                <p className="text-gray-900 font-normal">{company.actividad_principal}</p>
              </div>
            )}
            
            {company.segmento_empresa && (
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-normal">Segmento</p>
                <p className="text-gray-900 font-normal">{company.segmento_empresa}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

