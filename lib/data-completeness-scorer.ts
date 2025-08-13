/**
 * Sistema de puntuación para priorizar empresas con datos más completos
 */

import { Company } from '@/types/company';

// Campos importantes y sus pesos para el scoring
const FIELD_WEIGHTS = {
  // Información básica (peso alto)
  nombre: 3,
  ruc: 3,
  tipo: 2,
  provincia: 2,
  
  // Información financiera (peso muy alto)
  ingresos_ventas: 4,
  activos: 4,
  patrimonio: 4,
  utilidad_an_imp: 4,
  utilidad_neta: 3,
  n_empleados: 3,
  
  // Información adicional (peso medio)
  ciiu: 2,
  descripcion: 2,
  segmento: 2,
  actividad_principal: 2,
  estado_empresa: 2,
  tipo_empresa: 2,
  fecha_constitucion: 1,
  
  // Información de contacto (peso medio)
  director_nombre: 2,
  director_telefono: 2,
  director_representante: 2,
  director_cargo: 1,
  
  // Ubicación detallada (peso bajo-medio)
  canton: 1,
  ciudad: 1,
  nombre_comercial: 1,
  
  // Ratios financieros (peso medio si disponibles)
  liquidez_corriente: 2,
  prueba_acida: 2,
  roe: 2,
  roa: 2,
  margen_bruto: 2,
  margen_operacional: 2,
  rent_neta_ventas: 2,
  
  // Otros campos financieros
  gastos_financieros: 1,
  gastos_admin_ventas: 1,
  costos_ventas_prod: 1,
  deuda_total: 1,
  total_gastos: 1,
};

/**
 * Calcula un score de completitud de datos para una empresa
 * @param company - La empresa a evaluar
 * @returns Score de 0-100 donde 100 significa datos completamente completos
 */
export function calculateCompletenessScore(company: Company): number {
  let totalPossibleScore = 0;
  let actualScore = 0;
  
  // Evaluar cada campo con su peso correspondiente
  Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
    totalPossibleScore += weight;
    
    const value = (company as unknown as Record<string, unknown>)[field];
    
    // Considerar el campo como "completo" si:
    // - No es null o undefined
    // - No es una cadena vacía
    // - Si es número, no es 0 (para algunos campos financieros)
    if (value !== null && value !== undefined && value !== '') {
      // Para campos financieros, 0 podría ser un valor válido,
      // pero para otros campos como nombres, probablemente indica falta de datos
      if (typeof value === 'number') {
        // Para campos financieros, incluso 0 cuenta como dato válido
        if (['ingresos_ventas', 'activos', 'patrimonio', 'utilidad_an_imp', 'utilidad_neta', 'n_empleados'].includes(field)) {
          actualScore += weight;
        } else if (value !== 0) {
          // Para otros campos numéricos, 0 podría indicar falta de datos
          actualScore += weight;
        }
      } else {
        // Para campos de texto, cualquier valor no vacío cuenta
        actualScore += weight;
      }
    }
  });
  
  // Calcular porcentaje
  const completenessPercentage = totalPossibleScore > 0 ? (actualScore / totalPossibleScore) * 100 : 0;
  
  return Math.round(completenessPercentage * 100) / 100; // Redondear a 2 decimales
}

/**
 * Ordena un array de empresas por completitud de datos (de mayor a menor completitud)
 * @param companies - Array de empresas a ordenar
 * @returns Array ordenado con empresas más completas primero
 */
export function sortByDataCompleteness(companies: Company[]): Company[] {
  return companies
    .map(company => ({
      company,
      score: calculateCompletenessScore(company)
    }))
    .sort((a, b) => b.score - a.score) // Ordenar de mayor a menor score
    .map(item => item.company);
}

/**
 * Ordena empresas con un algoritmo híbrido que considera tanto la completitud
 * como otros factores de relevancia (como año más reciente)
 * @param companies - Array de empresas a ordenar
 * @returns Array ordenado con mejor balance de completitud y relevancia
 */
export function sortByRelevanceAndCompleteness(companies: Company[]): Company[] {
  return companies
    .map(company => {
      const completenessScore = calculateCompletenessScore(company);
      
      // Bonus por año más reciente (empresas más actuales)
      const currentYear = new Date().getFullYear();
      const companyYear = company.anio || 0;
      const yearBonus = Math.max(0, (companyYear - (currentYear - 10)) * 2); // Bonus para últimos 10 años
      
      // Score combinado
      const totalScore = completenessScore + yearBonus;
      
      return {
        company,
        completenessScore,
        yearBonus,
        totalScore
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(item => item.company);
}

/**
 * Obtiene estadísticas de completitud para un conjunto de empresas
 * @param companies - Array de empresas
 * @returns Estadísticas de completitud
 */
export function getCompletenessStats(companies: Company[]) {
  if (companies.length === 0) {
    return {
      averageCompleteness: 0,
      highQualityCount: 0,
      mediumQualityCount: 0,
      lowQualityCount: 0,
      totalCount: 0
    };
  }
  
  const scores = companies.map(calculateCompletenessScore);
  const averageCompleteness = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  const highQualityCount = scores.filter(score => score >= 70).length;
  const mediumQualityCount = scores.filter(score => score >= 40 && score < 70).length;
  const lowQualityCount = scores.filter(score => score < 40).length;
  
  return {
    averageCompleteness: Math.round(averageCompleteness * 100) / 100,
    highQualityCount,
    mediumQualityCount,
    lowQualityCount,
    totalCount: companies.length
  };
}
