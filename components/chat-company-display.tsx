'use client'

import React from 'react'
import { type Company } from '@/types/company'
import Link from 'next/link'
import { ExternalLink, Building2, Users, DollarSign, TrendingUp, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

// ============================================================================
// SIMPLE COMPANY CARD
// ============================================================================

function CompanyCard({ company, index = 0 }: { company: Company; index?: number }) {
  const formatCurrency = (value: number | null | undefined): string => {
    if (!value) return 'N/A'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <h4 className="font-medium text-slate-900 truncate">
              {company.nombre_comercial || company.nombre}
            </h4>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">RUC: {company.ruc}</p>
        </div>
        <Link 
          href={`/companies/${company.ruc}`}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
          title="Ver perfil completo"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-slate-500">Ingresos:</span>
          <span className="font-medium text-slate-900">{formatCurrency(company.ingresos_ventas)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-slate-500">Empleados:</span>
          <span className="font-medium text-slate-900">{company.n_empleados || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`w-3.5 h-3.5 ${company.utilidad_neta && company.utilidad_neta > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
          <span className="text-slate-500">Utilidad:</span>
          <span className={`font-medium ${company.utilidad_neta && company.utilidad_neta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(company.utilidad_neta)}
          </span>
        </div>
        {company.provincia && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">{company.provincia}</span>
          </div>
        )}
      </div>

      {/* Contact info if available */}
      {company.director_representante && (
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="font-medium text-slate-700">{company.director_representante}</span>
          {company.director_cargo && <span className="ml-1">({company.director_cargo})</span>}
          {company.director_telefono && <span className="ml-2">• {company.director_telefono}</span>}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// MAIN EXPORT - SIMPLE COMPANY DISPLAY
// ============================================================================

export type DisplayMode = 'single' | 'comparison' | 'list' | 'featured'

export interface CompanyDisplayConfig {
  mode: DisplayMode
  featuredRUCs: string[]
  query?: string
  totalCount?: number
  allCompanies?: Company[]
  selectionReason?: string
}

/**
 * SIMPLIFIED Company Display
 * 
 * Shows companies from search results. Uses featuredRUCs to filter.
 * If featuredRUCs provided → show only those companies
 * If no featuredRUCs → show top 4 companies from results
 */
export function SmartCompanyDisplay({ 
  companies, 
  totalCount, 
  query,
  featuredRUCs = [],
}: { 
  companies: Company[]
  totalCount: number
  query: string
  featuredRUCs?: string[]
  mode?: DisplayMode
  aiResponseText?: string  // Ignored - kept for backwards compatibility
}) {
  // Simple logic: use featuredRUCs if available, otherwise top 4
  // Also deduplicate by RUC (keep most recent year)
  const displayCompanies = React.useMemo(() => {
    // Deduplicate: keep only most recent year per RUC
    const deduped = new Map<string, Company>()
    for (const company of companies) {
      if (!company.ruc) continue
      const existing = deduped.get(company.ruc)
      if (!existing || (company.anio && (!existing.anio || company.anio > existing.anio))) {
        deduped.set(company.ruc, company)
      }
    }
    const uniqueCompanies = Array.from(deduped.values())

    if (featuredRUCs.length > 0) {
      // Filter to only featured companies, preserve order
      const filtered = featuredRUCs
        .map(ruc => uniqueCompanies.find(c => c.ruc === ruc))
        .filter((c): c is Company => c !== undefined)
      return filtered.slice(0, 4)
    }
    // Fallback: top 4 companies
    return uniqueCompanies.slice(0, 4)
  }, [companies, featuredRUCs])

  // Don't render if no companies
  if (displayCompanies.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayCompanies.map((company, idx) => (
          <CompanyCard 
            key={`${company.ruc}-${company.anio || 'unknown'}-${idx}`} 
            company={company} 
            index={idx} 
          />
        ))}
      </div>
      
      {totalCount > displayCompanies.length && (
        <p className="text-xs text-slate-500 text-center">
          Mostrando {displayCompanies.length} de {totalCount} resultados
        </p>
      )}
    </div>
  )
}

// Legacy export for backwards compatibility
export { SmartCompanyDisplay as ChatCompanyDisplay }
