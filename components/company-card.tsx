'use client'

import { type Company } from '@/types/company'
import Link from 'next/link'
import { TrendingUp, Users, DollarSign, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CompanyCardProps {
  company: Company
  variant?: 'grid' | 'overview'
}

export function CompanyCard({ company, variant = 'grid' }: CompanyCardProps) {
  // Overview variant for profile page
  if (variant === 'overview') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-900">
        <h3 className="text-base font-medium text-gray-900 mb-6">Resumen Financiero Actual</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <DollarSign className="h-4 w-4" />
              <p className="text-xs font-medium">Ingresos Ventas</p>
            </div>
            <p className="text-lg font-normal text-gray-900">
              ${company.ingresos_ventas?.toLocaleString() || 'N/A'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Building2 className="h-4 w-4" />
              <p className="text-xs font-medium">Activos</p>
            </div>
            <p className="text-lg font-normal text-gray-900">
              ${company.activos?.toLocaleString() || 'N/A'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs font-medium">Patrimonio</p>
            </div>
            <p className="text-lg font-normal text-gray-900">
              ${company.patrimonio?.toLocaleString() || 'N/A'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Users className="h-4 w-4" />
              <p className="text-xs font-medium">Empleados</p>
            </div>
            <p className="text-lg font-normal text-gray-900">
              {company.n_empleados?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Utilidad Neta</p>
              <p className="text-sm font-normal text-gray-900">
                ${company.utilidad_neta?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Total Gastos</p>
              <p className="text-sm font-normal text-gray-900">
                ${company.total_gastos?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Impuesto Renta</p>
              <p className="text-sm font-normal text-gray-900">
                ${company.impuesto_renta?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Gastos Financieros</p>
              <p className="text-sm font-normal text-gray-900">
                ${company.gastos_financieros?.toLocaleString() || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  // Grid variant for listing page (default)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 h-full flex flex-col text-gray-900 transition-all duration-200">
      <div className="flex-grow">
        {/* Card Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center">
            <span className="text-white font-medium text-base">{initials}</span>
          </div>
          <div className="flex-1 truncate">
            <h3 className="font-medium text-gray-900 leading-tight truncate" title={companyName}>
              {companyName}
            </h3>
            <p className="text-xs text-gray-500">
              @{company.ruc}
            </p>
            {company.provincia && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{company.provincia}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Information */}
        <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Activos</p>
            <p className="text-sm font-normal">{company.activos?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Patrimonio</p>
            <p className="text-sm font-normal">{company.patrimonio?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Ingresos</p>
            <p className="text-sm font-normal">{company.ingresos_ventas?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Empleados</p>
            <p className="text-sm font-normal">{company.n_empleados?.toLocaleString() || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-4 space-y-4">
        <div className="flex justify-end items-center text-xs text-gray-500">
          <span>{company.anio}</span>
        </div>
        <Link href={`/companies/${company.ruc}`} className="w-full flex justify-center">
          <Button variant="outline" className="text-indigo-600 border-indigo-600 hover:bg-indigo-50 px-4 h-9">
            Ver perfil
          </Button>
        </Link>
      </div>
    </div>
  )
}
