/**
 * Sistema de puntuación para priorizar empresas con datos más completos y relevantes para contacto.
 */

import { Company } from '@/types/company';

// Campos importantes y sus pesos para el scoring, priorizando contacto.
const FIELD_WEIGHTS = {
  // Información de contacto (peso MÁS ALTO)
  director_nombre: 8,
  director_representante: 7,
  director_telefono: 7,
  director_cargo: 4,

  // Información financiera clave (peso alto)
  ingresos_ventas: 4,
  utilidad_neta: 4,
  n_empleados: 3,
  activos: 3,
  patrimonio: 3,

  // Información básica (peso medio)
  nombre: 3,
  ruc: 3,
  provincia: 2,
  nombre_comercial: 2,
  
  // Información adicional (peso bajo)
  ciiu: 1,
  descripcion: 1,
  segmento: 1,
  actividad_principal: 1,
  estado_empresa: 1,
  tipo_empresa: 1,
  fecha_constitucion: 1,
  
  // Ubicación detallada (peso bajo)
  canton: 1,
  ciudad: 1,

  // Campos financieros secundarios (peso bajo)
  utilidad_an_imp: 2,
  roe: 1,
  roa: 1,
};

/**
 * Calcula un score de completitud de datos para una empresa.
 * @param company - La empresa a evaluar.
 * @returns Score de 0-100 donde 100 significa datos completamente completos.
 */
export function calculateCompletenessScore(company: Company): number {
  let totalPossibleScore = 0;
  let actualScore = 0;
  
  Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
    totalPossibleScore += weight;
    
    const value = (company as unknown as Record<string, unknown>)[field];
    
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'number' && value === 0) {
        // Para ciertos campos financieros, 0 es un dato válido.
        if (['ingresos_ventas', 'activos', 'patrimonio', 'utilidad_neta'].includes(field)) {
          actualScore += weight;
        }
      } else {
        actualScore += weight;
      }
    }
  });
  
  const completenessPercentage = totalPossibleScore > 0 ? (actualScore / totalPossibleScore) * 100 : 0;
  
  return Math.round(completenessPercentage);
}

/**
 * Ordena un array de empresas por completitud de datos (de mayor a menor completitud).
 * @param companies - Array de empresas a ordenar.
 * @returns Array ordenado con empresas más completas primero.
 */
export function sortByDataCompleteness(companies: Company[]): Company[] {
  return companies
    .map(company => ({
      company,
      score: calculateCompletenessScore(company)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.company);
}

/**
 * Ordena empresas con un algoritmo híbrido que considera completitud,
 * relevancia de contacto y año más reciente.
 * @param companies - Array de empresas a ordenar.
 * @returns Array ordenado con mejor balance de completitud y relevancia.
 */
export function sortByRelevanceAndCompleteness(companies: Company[]): Company[] {
  return companies
    .map(company => {
      const completenessScore = calculateCompletenessScore(company);
      
      // Bonus por año más reciente (empresas más actuales)
      const currentYear = new Date().getFullYear();
      const companyYear = company.anio || 0;
      const yearBonus = Math.max(0, (companyYear - (currentYear - 5)) * 3); // Bonus para últimos 5 años

      // BONUS MASIVO por tener información de contacto clave
      let contactBonus = 0;
      if (company.director_nombre || company.director_representante) {
        contactBonus += 25; // Gran bonus por tener un nombre de contacto
      }
      if (company.director_telefono) {
        contactBonus += 25; // Gran bonus por tener un teléfono
      }
      
      // Score combinado
      const totalScore = completenessScore + yearBonus + contactBonus;
      
      return {
        company,
        completenessScore,
        yearBonus,
        contactBonus,
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
