'use client'

import React from 'react'
import { type Company } from '@/types/company'
import Link from 'next/link'
import { ExternalLink, Building2, Users, DollarSign, TrendingUp, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { calculateCompletenessScore } from '@/lib/data-completeness-scorer'

interface ChatCompanyCardProps {
  company: Company
  index?: number
}

// Helper function to get data quality indicator
function getDataQualityIndicator(score: number) {
  if (score >= 70) {
    return {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      label: 'Datos completos',
      description: `${score.toFixed(0)}% información disponible`
    };
  } else if (score >= 40) {
    return {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      label: 'Datos parciales',
      description: `${score.toFixed(0)}% información disponible`
    };
  } else {
    return {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      label: 'Datos limitados',
      description: `${score.toFixed(0)}% información disponible`
    };
  }
}

export function ChatCompanyCard({ company, index = 0 }: ChatCompanyCardProps) {
  const completenessScore = calculateCompletenessScore(company);
  const qualityIndicator = getDataQualityIndicator(completenessScore);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-all duration-200 w-full"
    >
      {/* Header with company name and link */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 leading-tight truncate">
            {company.nombre_comercial || company.nombre}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-500">
              RUC: {company.ruc}
            </p>
            {/* Data Quality Indicator */}
            <div 
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${qualityIndicator.bgColor}`}
              title={qualityIndicator.description}
            >
              {React.createElement(qualityIndicator.icon, { 
                className: `w-3 h-3 ${qualityIndicator.color}` 
              })}
              <span className={`text-xs font-medium ${qualityIndicator.color}`}>
                {qualityIndicator.label}
              </span>
            </div>
          </div>
        </div>
        <Link 
          href={`/companies/${company.ruc}`}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Ver detalles"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Revenue */}
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Ingresos</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {company.ingresos_ventas ? `$${company.ingresos_ventas.toLocaleString()}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Employees */}
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Empleados</p>
            <p className="text-sm font-medium text-gray-900">
              {company.n_empleados || 'N/A'}
            </p>
          </div>
        </div>

        {/* Assets */}
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Activos</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {company.activos ? `$${company.activos.toLocaleString()}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="flex items-center space-x-2">
          <TrendingUp className={`w-4 h-4 flex-shrink-0 ${
            company.utilidad_neta && company.utilidad_neta > 0 
              ? 'text-green-500' 
              : 'text-red-500'
          }`} />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Utilidad</p>
            <p className={`text-sm font-medium truncate ${
              company.utilidad_neta && company.utilidad_neta > 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {company.utilidad_neta ? `$${company.utilidad_neta.toLocaleString()}` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Location and year */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>{company.provincia}</span>
        <span>Año {company.anio}</span>
      </div>

      {/* Director info if available */}
      {(company.director_representante || company.director_cargo) && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">Contacto</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-900 truncate">
              {company.director_representante || 'N/A'}
            </span>
            {company.director_cargo && (
              <span className="text-xs text-gray-500 ml-2 truncate">
                {company.director_cargo}
              </span>
            )}
          </div>
          {company.director_telefono && (
            <p className="text-xs text-gray-500 mt-1">
              Tel: {company.director_telefono}
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

interface ChatCompanyResultsProps {
  companies: Company[]
  totalCount: number
  query: string
  onLoadMore?: () => void
  hasMore?: boolean
}

export function ChatCompanyResults({ 
  companies, 
  totalCount, 
  query, 
  onLoadMore,
  hasMore = false 
}: ChatCompanyResultsProps) {
  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">
            Resultados de búsqueda
          </h4>
          <p className="text-sm text-gray-600">
            {totalCount} empresas encontradas para &quot;{query}&quot;
          </p>
        </div>
      </div>

      {/* Company cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {companies.map((company, index) => (
          <ChatCompanyCard 
            key={`${company.ruc || company.id}-${company.anio || 'unknown'}-${index}`} 
            company={company} 
            index={index}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-2">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Ver más resultados
          </button>
        </div>
      )}

      {/* Results summary */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Mostrando {companies.length} de {totalCount} resultados
        </p>
      </div>
    </div>
  )
}
