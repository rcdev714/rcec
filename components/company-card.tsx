'use client'

import { type Company } from '@/types/company'
import Link from 'next/link'

interface CompanyCardProps {
  company: Company
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/companies/${company.ruc}`} className="block group">
      <div className="bg-card border border-border rounded-lg p-6 h-full flex flex-col group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-200">
        <div className="space-y-4 flex-grow">
          {/* Company Name */}
          <div className="space-y-1">
            <h3 className="font-medium text-foreground leading-tight">
              {company.nombre_comercial || company.nombre}
            </h3>
            <p className="text-xs text-muted-foreground">
              RUC: {company.ruc}
            </p>
          </div>

          {/* Financial Information */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="notion-text font-medium">{company.activos?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Patrimonio</p>
                <p className="notion-text font-medium">{company.patrimonio?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Utilidad Neta</p>
                <p className="notion-text font-medium">{company.utilidad_neta?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Gastos</p>
                <p className="notion-text font-medium">{company.total_gastos?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Provincia</p>
              <p className="notion-text-sm">{company.provincia}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Empleados</p>
              <p className="notion-text-sm">{company.n_empleados || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Año Fiscal</p>
              <p className="notion-text-sm">{company.anio}</p>
            </div>
          </div>

          {/* Director Information */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Director</p>
              <p className="notion-text-sm truncate">{company.director_representante || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="notion-text-sm truncate">{company.director_cargo || 'N/A'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="notion-text-sm truncate">{company.director_telefono || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
