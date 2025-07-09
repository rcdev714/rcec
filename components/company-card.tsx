'use client'

import { type Company } from '@/types/company'
import { Card } from '@/components/ui/card'

interface CompanyCardProps {
  company: Company
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Card className="relative overflow-hidden rounded-lg shadow-lg dark:shadow-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all duration-300 ease-in-out">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 dark:from-blue-950 dark:via-gray-950 dark:to-blue-900 opacity-10"></div>
      <div className="relative p-6 flex flex-col justify-between h-full">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
            {company.nombre_comercial || company.nombre}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            <span className="font-semibold">RUC:</span> {company.ruc}
          </p>
        </div>

        <div className="mt-4 space-y-1 text-base">
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Activos:</span> {company.activos}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Patrimonio:</span> {company.patrimonio}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Utilidad Neta:</span> {company.utilidad_neta}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Total Gastos:</span> {company.total_gastos}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Provincia:</span> {company.provincia}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Número de Empleados:</span> {company.n_empleados}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Año Fiscal:</span> {company.anio}
          </p>
        </div>
      </div>
    </Card>
  )
}
