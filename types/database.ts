/**
 * Supabase Database Types
 * Auto-generated from Supabase schema
 * Last updated: 2025-12-04
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          actividad_principal: string | null
          activos: number | null
          amortizaciones: number | null
          anio: number | null
          apalancamiento: number | null
          apalancamiento_c_l_plazo: number | null
          apalancamiento_financiero: number | null
          canton: string | null
          cia_imvalores: number | null
          ciiu: string | null
          ciiu_n1: string | null
          ciiu_n6: string | null
          ciudad: string | null
          cobertura_interes: number | null
          cod_segmento: string | null
          costos_ventas_prod: number | null
          depreciaciones: number | null
          descripcion: string | null
          deuda_total: number | null
          deuda_total_c_plazo: number | null
          end_activo: number | null
          end_activo_fijo: number | null
          end_corto_plazo: number | null
          end_largo_plazo: number | null
          end_patrimonial: number | null
          end_patrimonial_ct: number | null
          end_patrimonial_nct: number | null
          estado_empresa: string | null
          expediente: string | null
          fecha_constitucion: string | null
          fortaleza_patrimonial: number | null
          gastos_admin_ventas: number | null
          gastos_financieros: number | null
          id: number
          id_estado_financiero: string | null
          id_segmento: string | null
          impac_carga_finan: number | null
          impac_gasto_a_v: number | null
          impuesto_renta: number | null
          ingresos_totales: number | null
          ingresos_ventas: number | null
          liquidez_corriente: number | null
          margen_bruto: number | null
          margen_operacional: number | null
          n_empleados: number | null
          nombre: string | null
          nombre_comercial: string | null
          patrimonio: number | null
          per_med_cobranza: number | null
          per_med_pago: number | null
          posicion_general: number | null
          pro_codigo: number | null
          provincia: string | null
          prueba_acida: number | null
          rent_neta_activo: number | null
          rent_neta_ventas: number | null
          rent_ope_activo: number | null
          rent_ope_patrimonio: number | null
          roa: number | null
          roe: number | null
          rot_activo_fijo: number | null
          rot_cartera: number | null
          rot_ventas: number | null
          ruc: string | null
          segmento: string | null
          segmento_empresa: string | null
          tipo: string | null
          tipo_empresa: string | null
          total_gastos: number | null
          utilidad_an_imp: number | null
          utilidad_ejercicio: number | null
          utilidad_neta: number | null
        }
        Insert: {
          [K in keyof Database['public']['Tables']['companies']['Row']]?: Database['public']['Tables']['companies']['Row'][K]
        }
        Update: {
          [K in keyof Database['public']['Tables']['companies']['Row']]?: Database['public']['Tables']['companies']['Row'][K]
        }
        Relationships: []
      }
      // ... other tables omitted for brevity
    }
    Views: {
      latest_companies_with_directors: {
        Row: Database['public']['Tables']['companies']['Row'] & {
          director_cargo: string | null
          director_nombre: string | null
          director_representante: string | null
          director_telefono: string | null
        }
      }
    }
    Functions: {
      search_companies_by_sector: {
        Args: {
          p_sector_keywords: string[]
          p_ciiu_prefixes?: string[] | null
          p_province_filter?: string | null
          p_min_revenue?: number | null
          p_min_employees?: number | null
          p_max_results?: number
        }
        Returns: {
          id: number
          ruc: string
          nombre: string
          nombre_comercial: string
          provincia: string
          descripcion: string
          ciiu: string
          ciiu_n1: string
          segmento: string
          ingresos_ventas: number
          n_empleados: number
          utilidad_neta: number
          anio: number
          sector_match_type: string
          sector_relevance: number
        }[]
      }
      search_companies_semantic: {
        Args: {
          search_query: string
          sector_codes?: string[] | null
          province_filter?: string | null
          min_revenue?: number | null
          max_results?: number
        }
        Returns: {
          id: number
          ruc: string
          nombre: string
          nombre_comercial: string
          provincia: string
          descripcion: string
          ciiu: string
          ciiu_n1: string
          segmento: string
          ingresos_ventas: number
          n_empleados: number
          utilidad_neta: number
          anio: number
          relevance_score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for using the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]

// Company type from database
export type DBCompany = Tables<'companies'>

// RPC function result types
export type SectorSearchResult = Functions<'search_companies_by_sector'>['Returns'][number]
export type SemanticSearchResult = Functions<'search_companies_semantic'>['Returns'][number]

