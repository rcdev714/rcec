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
      <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Información de Contacto
        </h3>
        
        <div className="space-y-4">
          {/* Representative */}
          {company.director_representante && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Representante</p>
              <p className="text-sm font-normal text-gray-900">
                {company.director_representante}
              </p>
            </div>
          )}

          {/* Position */}
          {company.director_cargo && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
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
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Teléfono Empresa
              </p>
              <a 
                href={`tel:${company.director_telefono}`}
                className="text-sm font-normal text-blue-600 hover:text-blue-700 transition-colors"
              >
                {company.director_telefono}
              </a>
            </div>
          )}

          {!company.director_representante && !company.director_cargo && !company.director_telefono && (
            <p className="text-sm text-gray-500 italic">No hay información de contacto disponible</p>
          )}
        </div>
      </div>

      {/* Quick Stats Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Resumen Financiero
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">Activos</p>
              <p className="text-sm font-normal text-gray-900">
                {formatCurrency(company.activos)}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">Patrimonio</p>
              <p className="text-sm font-normal text-gray-900">
                {formatCurrency(company.patrimonio)}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Ingresos por Ventas</p>
            <p className="text-lg font-normal text-gray-900">
              {formatCurrency(company.ingresos_ventas)}
            </p>
          </div>
        </div>
      </div>

      {/* Company Details Card */}
      {(company.actividad_principal || company.segmento_empresa) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Detalles de la Empresa
          </h3>
          
          <div className="space-y-3 text-sm">
            {company.actividad_principal && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Actividad Principal</p>
                <p className="text-gray-900">{company.actividad_principal}</p>
              </div>
            )}
            
            {company.segmento_empresa && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Segmento</p>
                <p className="text-gray-900">{company.segmento_empresa}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

