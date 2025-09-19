'use client'

import { type Company } from '@/types/company'
import Link from 'next/link'

interface CompanyCardProps {
  company: Company
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/companies/${company.ruc}`} className="block group">
      <div className="bg-white border border-gray-200 rounded-lg p-6 h-full flex flex-col group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-200 text-gray-900">
        <div className="space-y-4 flex-grow">
          {/* Company Name */}
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900 leading-tight">
              {company.nombre_comercial || company.nombre}
            </h3>
            <p className="text-xs text-gray-500">
              RUC: {company.ruc}
            </p>
          </div>

          {/* Financial Information */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Activos</p>
                <p className="text-sm font-medium">{company.activos?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Patrimonio</p>
                <p className="text-sm font-medium">{company.patrimonio?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Utilidad Neta</p>
                <p className="text-sm font-medium">{company.utilidad_neta?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Total Gastos</p>
                <p className="text-sm font-medium">{company.total_gastos?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Provincia</p>
              <p className="text-xs text-gray-600">{company.provincia}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Empleados</p>
              <p className="text-xs text-gray-600">{company.n_empleados || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Año Fiscal</p>
              <p className="text-xs text-gray-600">{company.anio}</p>
            </div>
          </div>

          {/* Director Information */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Contacto</p>
              <p className="text-xs text-gray-600 truncate">{company.director_representante || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Cargo</p>
              <p className="text-xs text-gray-600 truncate">{company.director_cargo || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Teléfono</p>
              <p className="text-xs text-gray-600 truncate">{company.director_telefono || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
