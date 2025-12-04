import { SearchFilters, PROVINCE_MAPPING, COMPANY_SIZE_MAPPING, REVENUE_MAPPING } from '@/types/chat';

// ============================================================================
// SECTOR/INDUSTRY MAPPING - Maps user terms to database fields
// ============================================================================

/**
 * Maps common sector/industry terms to their database equivalents
 * The database has: actividad_principal, ciiu, segmento, descripcion
 */
export const SECTOR_KEYWORD_MAPPING: Record<string, string[]> = {
  // Food & Agriculture
  'alimentos': ['aliment', 'comida', 'food', 'bebida', 'lacteo', 'carnic', 'panaderi', 'conserva', 'azucar', 'aceite', 'granos', 'cereales', 'frutas', 'vegetales', 'procesadora', 'frigorific'],
  'agricola': ['agricol', 'agroindustri', 'cultivo', 'cosecha', 'siembra', 'ganaderi', 'pecuari', 'avicol', 'porcin', 'bovina', 'floricultura', 'banano', 'cacao', 'cafe', 'palma'],
  'restaurante': ['restaurant', 'comida', 'catering', 'cafeteria', 'hotel', 'hospedaje', 'alojamiento'],
  
  // Technology & Digital
  'tecnologia': ['tecnolog', 'software', 'sistema', 'informatica', 'digital', 'computacion', 'programacion', 'desarrollo', 'app', 'aplicacion', 'web', 'internet', 'cloud', 'datos'],
  'software': ['software', 'desarrollo', 'programacion', 'app', 'aplicacion', 'sistema informatico', 'SaaS'],
  'telecomunicaciones': ['telecom', 'comunicacion', 'telefon', 'internet', 'redes', 'fibra optica', 'conectividad'],
  
  // Construction & Real Estate
  'construccion': ['construcc', 'edificaci', 'obra', 'ingenieria civil', 'arquitectura', 'inmobiliari', 'vivienda', 'edificio', 'proyecto inmobiliario'],
  'inmobiliaria': ['inmobiliari', 'bienes raices', 'real estate', 'corretaje', 'alquiler', 'arrendamiento', 'propiedad'],
  
  // Transportation & Logistics
  'logistica': ['logistic', 'transporte', 'carga', 'envio', 'courier', 'distribucion', 'almacen', 'bodega', 'freight', 'naviera', 'portuari'],
  'transporte': ['transport', 'carga', 'pasajero', 'taxi', 'bus', 'camion', 'flete', 'mudanza', 'naviera'],
  
  // Healthcare & Pharma
  'salud': ['salud', 'medic', 'hospital', 'clinica', 'consultorio', 'laboratorio', 'diagnost', 'farmac', 'drogueria', 'farma'],
  'farmaceutica': ['farmac', 'farmaceutic', 'medicament', 'droga', 'laboratorio farmac'],
  
  // Finance & Insurance
  'financiero': ['financ', 'banco', 'credit', 'prestamo', 'inversion', 'bolsa', 'valores', 'fintech', 'cooperativa de ahorro'],
  'seguros': ['segur', 'asegurador', 'poliza', 'cobertura', 'reaseguro'],
  
  // Retail & Commerce
  'retail': ['retail', 'comercio', 'tienda', 'supermercado', 'almacen', 'minorista', 'mayorista', 'venta al por'],
  'comercio': ['comerci', 'compra', 'venta', 'importa', 'exporta', 'distribuidor', 'mayorista', 'minorista'],
  
  // Manufacturing & Industry
  'manufactura': ['manufactur', 'fabrica', 'industrial', 'produccion', 'ensambl', 'metalurg', 'maquinaria', 'textil', 'plastico'],
  'textil': ['textil', 'confeccion', 'ropa', 'vestimenta', 'tela', 'hilado', 'tejido', 'moda'],
  'quimico': ['quimic', 'petroquim', 'plastico', 'resina', 'polimero', 'farmoquimic', 'agroquimic'],
  
  // Energy & Mining
  'energia': ['energ', 'electric', 'petroleo', 'gas', 'renovable', 'solar', 'eolic', 'hidroelectr', 'combustible'],
  'mineria': ['miner', 'extraccion', 'canteras', 'oro', 'cobre', 'metalurg'],
  
  // Services
  'consultoria': ['consultor', 'asesori', 'advisory', 'consulting', 'gestion empresarial'],
  'educacion': ['educac', 'colegio', 'universidad', 'instituto', 'capacitacion', 'formacion', 'enseñanza', 'academico'],
  'turismo': ['turism', 'agencia de viaje', 'tour', 'operador turistico', 'hospedaje', 'hotel'],
  
  // Other common sectors
  'automotriz': ['automotriz', 'vehiculo', 'automovil', 'concesionario', 'autopart', 'mecanica', 'taller'],
  'publicidad': ['publicidad', 'marketing', 'medios', 'comunicacion', 'agencia de publicidad', 'btl', 'digital marketing'],
  'seguridad': ['seguridad', 'vigilancia', 'custodia', 'monitoreo', 'alarma', 'guardia'],
};

/**
 * CIIU code prefixes for common sectors (International Standard Industrial Classification)
 * These map to the ciiu_n1 (single letter) and ciiu (full code like C1010.XX) fields in the database
 * 
 * Database format examples:
 * - ciiu_n1: "C" (manufacturing section)
 * - ciiu: "C1010.11" (specific activity within section)
 * 
 * ISIC Sections:
 * A = Agriculture, forestry, fishing
 * B = Mining and quarrying
 * C = Manufacturing
 * D = Electricity, gas, steam
 * E = Water supply, sewerage
 * F = Construction
 * G = Wholesale and retail trade
 * H = Transportation and storage
 * I = Accommodation and food service
 * J = Information and communication
 * K = Financial and insurance
 * L = Real estate
 * M = Professional, scientific, technical
 * N = Administrative and support
 * P = Education
 * Q = Human health and social work
 */
export const CIIU_SECTOR_MAPPING: Record<string, string[]> = {
  // Food & Agriculture
  'alimentos': ['C10', 'C11', 'I56'], // C10=Food products, C11=Beverages, I56=Food service
  'agricola': ['A'], // All agriculture (section A)
  'restaurante': ['I56', 'I55'], // I56=Food service, I55=Accommodation
  
  // Technology & Digital
  'tecnologia': ['J62', 'J63'], // J62=Computer programming, J63=Information services
  'software': ['J62'], // Computer programming and consulting
  'telecomunicaciones': ['J61'], // Telecommunications
  
  // Construction & Real Estate
  'construccion': ['F'], // All construction (section F)
  'inmobiliaria': ['L68'], // Real estate activities
  
  // Transportation & Logistics
  'logistica': ['H52', 'H53'], // H52=Warehousing, H53=Postal/courier
  'transporte': ['H49', 'H50', 'H51'], // H49=Land, H50=Water, H51=Air transport
  
  // Healthcare & Pharma
  'salud': ['Q86', 'Q87'], // Q86=Human health, Q87=Residential care
  'farmaceutica': ['C21'], // C21=Pharmaceutical manufacturing
  
  // Finance & Insurance
  'financiero': ['K64', 'K66'], // K64=Financial services, K66=Auxiliary financial
  'seguros': ['K65'], // Insurance and pension funding
  
  // Retail & Commerce
  'retail': ['G47'], // Retail trade
  'comercio': ['G45', 'G46', 'G47'], // All trade (wholesale and retail)
  
  // Manufacturing & Industry
  'manufactura': ['C'], // All manufacturing (section C)
  'textil': ['C13', 'C14'], // C13=Textiles, C14=Wearing apparel
  'quimico': ['C20'], // Chemicals and chemical products
  
  // Energy & Mining
  'energia': ['D35'], // Electricity, gas, steam supply
  'mineria': ['B'], // All mining (section B)
  
  // Services
  'consultoria': ['M70'], // Management consultancy
  'educacion': ['P85'], // Education
  'turismo': ['N79', 'I55'], // N79=Travel agency, I55=Accommodation
  
  // Other
  'automotriz': ['C29', 'G45'], // C29=Motor vehicles mfg, G45=Motor vehicle trade
  'publicidad': ['M73'], // Advertising and market research
  'seguridad': ['N80'], // Security and investigation
};

export class FilterTranslator {
  /**
   * Translates natural language query into search filters
   */
  static translateQuery(query: string): SearchFilters {
    const filters: SearchFilters = {};
    const lowerQuery = query.toLowerCase();

    // Extract province information
    this.extractProvince(lowerQuery, filters);
    
    // Extract company size
    this.extractCompanySize(lowerQuery, filters);
    
    // Extract revenue information
    this.extractRevenue(lowerQuery, filters);
    
    // Extract employee count
    this.extractEmployeeCount(lowerQuery, filters);
    
    // Extract year information
    this.extractYear(lowerQuery, filters);
    
    // Extract profitability
    this.extractProfitability(lowerQuery, filters);
    
    // Extract specific company names or RUC
    this.extractCompanyIdentifiers(lowerQuery, filters);

    // Extract sort intent and gating flags
    this.extractSortIntent(lowerQuery, filters);
    
    // NEW: Extract sector/industry keywords
    this.extractSector(lowerQuery, filters);

    return filters;
  }

  /**
   * Extract sector/industry keywords from the query
   * This enables searching by business activity
   */
  private static extractSector(query: string, filters: SearchFilters): void {
    // Common sector trigger patterns
    const sectorPatterns = [
      /(?:empresas?|compañías?|proveedores?|fabricantes?|distribuidores?)\s+(?:de|del|en\s+el\s+sector)\s+(\w+(?:\s+\w+)?)/i,
      /(?:sector|industria|rubro)\s+(?:de\s+)?(\w+(?:\s+\w+)?)/i,
      /proveedores?\s+de\s+(\w+(?:\s+\w+)?)/i,
      /distribuidores?\s+de\s+(\w+(?:\s+\w+)?)/i,
      /fabricantes?\s+de\s+(\w+(?:\s+\w+)?)/i,
    ];
    
    // Try to extract sector from patterns first
    for (const pattern of sectorPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const extractedSector = match[1].toLowerCase().trim();
        // Check if the extracted term maps to a known sector
        for (const [sectorKey, keywords] of Object.entries(SECTOR_KEYWORD_MAPPING)) {
          if (extractedSector.includes(sectorKey) || keywords.some(kw => extractedSector.includes(kw))) {
            filters.sector = sectorKey;
            filters.sectorKeywords = keywords;
            if (CIIU_SECTOR_MAPPING[sectorKey]) {
              filters.sectorCIIU = CIIU_SECTOR_MAPPING[sectorKey];
            }
            return;
          }
        }
        // If no known sector match, use the extracted term as-is for text search
        filters.sectorText = extractedSector;
        return;
      }
    }
    
    // If no pattern match, check for any sector keywords in the query
    for (const [sectorKey, keywords] of Object.entries(SECTOR_KEYWORD_MAPPING)) {
      // Check if the sector name itself appears
      if (query.includes(sectorKey)) {
        filters.sector = sectorKey;
        filters.sectorKeywords = keywords;
        if (CIIU_SECTOR_MAPPING[sectorKey]) {
          filters.sectorCIIU = CIIU_SECTOR_MAPPING[sectorKey];
        }
        return;
      }
      // Check if any keyword appears
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          filters.sector = sectorKey;
          filters.sectorKeywords = keywords;
          if (CIIU_SECTOR_MAPPING[sectorKey]) {
            filters.sectorCIIU = CIIU_SECTOR_MAPPING[sectorKey];
          }
          return;
        }
      }
    }
  }

  private static extractProvince(query: string, filters: SearchFilters): void {
    for (const [key, province] of Object.entries(PROVINCE_MAPPING)) {
      if (query.includes(key)) {
        filters.provincia = province;
        break;
      }
    }

    // Additional patterns for province extraction
    const provincePatterns = [
      /en\s+(.*?)(?:\s|$)/,
      /de\s+(.*?)(?:\s|$)/,
      /from\s+(.*?)(?:\s|$)/,
      /in\s+(.*?)(?:\s|$)/,
    ];

    for (const pattern of provincePatterns) {
      const match = query.match(pattern);
      if (match) {
        const location = match[1].trim();
        if (PROVINCE_MAPPING[location]) {
          filters.provincia = PROVINCE_MAPPING[location];
          break;
        }
      }
    }
  }

  /**
   * Detect sorting preferences from natural language and set sortBy/sortDir and gating flags
   */
  private static extractSortIntent(query: string, filters: SearchFilters): void {
    // Default direction when a "más/mayores/highest/most" intent is present
    let detectedSortDir: 'asc' | 'desc' | undefined;

    const descCues = [
      'más ', // e.g., "más ingresos", "más empleados"
      'mayores',
      'mayor ',
      'highest',
      'most',
      'top ',
      'más altos',
      'más altas',
      'más grande',
      'larger',
    ];
    const ascCues = [
      'menos ',
      'menor ',
      'menores',
      'lowest',
      'least',
      'más bajos',
      'más bajas',
    ];

    if (ascCues.some(cue => query.includes(cue))) {
      detectedSortDir = 'asc';
    } else if (descCues.some(cue => query.includes(cue))) {
      detectedSortDir = 'desc';
    }

    // Revenue / sales intent
    const revenueSortCues = [
      'ingresos', 'ventas', 'facturación', 'revenue', 'sales'
    ];
    if (revenueSortCues.some(cue => query.includes(cue)) &&
        ['más ', 'mayor ', 'mayores', 'highest', 'most', 'lowest', 'least', 'más altos', 'más bajas', 'más bajos'].some(c => query.includes(c))) {
      filters.sortBy = 'ingresos_ventas';
      filters.sortDir = detectedSortDir || 'desc';
      // When sorting by ingresos, prefer records that actually have ingresos
      filters.requireIngresos = 'true';
      return;
    }

    // Employees intent
    const employeesSortCues = [
      'empleados', 'trabajadores', 'headcount', 'staff', 'número de empleados', 'numero de empleados'
    ];
    if (employeesSortCues.some(cue => query.includes(cue)) &&
        ['más ', 'mayor ', 'mayores', 'highest', 'most', 'lowest', 'least'].some(c => query.includes(c))) {
      filters.sortBy = 'n_empleados';
      filters.sortDir = detectedSortDir || 'desc';
      filters.requireEmpleados = 'true';
      return;
    }

    // Profit intent
    const profitCues = ['utilidad', 'ganancia', 'profit', 'earnings'];
    if (profitCues.some(cue => query.includes(cue)) &&
        ['más ', 'mayor ', 'mayores', 'highest', 'most', 'lowest', 'least'].some(c => query.includes(c))) {
      filters.sortBy = 'utilidad_neta';
      filters.sortDir = detectedSortDir || 'desc';
      return;
    }

    // Explicit directives like "ordenar por X asc|desc"
    const orderByMatch = query.match(/ordenar\s+por\s+(ingresos|ventas|empleados|utilidad|activos|año|anio)\s*(asc|desc)?/);
    if (orderByMatch) {
      const field = orderByMatch[1];
      const dir = orderByMatch[2] as 'asc' | 'desc' | undefined;
      const mapping: Record<string, SearchFilters['sortBy']> = {
        ingresos: 'ingresos_ventas', ventas: 'ingresos_ventas', empleados: 'n_empleados', utilidad: 'utilidad_neta', activos: 'activos', año: 'anio', anio: 'anio'
      };
      filters.sortBy = mapping[field] || 'completitud';
      filters.sortDir = dir || 'desc';
      if (filters.sortBy === 'ingresos_ventas') filters.requireIngresos = 'true';
      if (filters.sortBy === 'n_empleados') filters.requireEmpleados = 'true';
    }
  }

  private static extractCompanySize(query: string, filters: SearchFilters): void {
    for (const [size, range] of Object.entries(COMPANY_SIZE_MAPPING)) {
      if (query.includes(size)) {
        Object.assign(filters, range);
        break;
      }
    }

    // Specific employee count patterns
    const employeePatterns = [
      /con\s+más\s+de\s+(\d+)\s+empleados/,
      /with\s+more\s+than\s+(\d+)\s+employees/,
      /over\s+(\d+)\s+employees/,
      /(\d+)\+\s+employees/,
      /más\s+de\s+(\d+)\s+trabajadores/,
    ];

    for (const pattern of employeePatterns) {
      const match = query.match(pattern);
      if (match) {
        filters.nEmpleadosMin = match[1];
        break;
      }
    }

    const employeeRangePatterns = [
      /entre\s+(\d+)\s+y\s+(\d+)\s+empleados/,
      /between\s+(\d+)\s+and\s+(\d+)\s+employees/,
      /(\d+)-(\d+)\s+employees/,
    ];

    for (const pattern of employeeRangePatterns) {
      const match = query.match(pattern);
      if (match) {
        filters.nEmpleadosMin = match[1];
        filters.nEmpleadosMax = match[2];
        break;
      }
    }
  }

  private static extractRevenue(query: string, filters: SearchFilters): void {
    for (const [level, range] of Object.entries(REVENUE_MAPPING)) {
      if (query.includes(level)) {
        Object.assign(filters, range);
        break;
      }
    }

    // Revenue amount patterns
    const revenuePatterns = [
      /ingresos\s+de\s+más\s+de\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(millones?|miles?|m|k)?/,
      /revenue\s+over\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|thousand|m|k)?/,
      /ventas\s+superiores?\s+a\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(millones?|miles?|m|k)?/,
      /more\s+than\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|thousand|m|k)?\s+in\s+revenue/,
    ];

    for (const pattern of revenuePatterns) {
      const match = query.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2]?.toLowerCase();
        
        if (unit && (unit.includes('million') || unit.includes('millón') || unit === 'm')) {
          amount *= 1000000;
        } else if (unit && (unit.includes('thousand') || unit.includes('mil') || unit === 'k')) {
          amount *= 1000;
        }
        
        filters.ingresosVentasMin = amount.toString();
        break;
      }
    }

    // Revenue range patterns
    const revenueRangePatterns = [
      /ingresos\s+entre\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*y\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(millones?|miles?)?/,
      /revenue\s+between\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*and\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|thousand)?/,
    ];

    for (const pattern of revenueRangePatterns) {
      const match = query.match(pattern);
      if (match) {
        let minAmount = parseFloat(match[1].replace(/,/g, ''));
        let maxAmount = parseFloat(match[2].replace(/,/g, ''));
        const unit = match[3]?.toLowerCase();
        
        if (unit && (unit.includes('million') || unit.includes('millón'))) {
          minAmount *= 1000000;
          maxAmount *= 1000000;
        } else if (unit && (unit.includes('thousand') || unit.includes('mil'))) {
          minAmount *= 1000;
          maxAmount *= 1000;
        }
        
        filters.ingresosVentasMin = minAmount.toString();
        filters.ingresosVentasMax = maxAmount.toString();
        break;
      }
    }
  }

  private static extractEmployeeCount(query: string, filters: SearchFilters): void {
    // Already handled in extractCompanySize, but adding specific patterns
    const patterns = [
      /con\s+(\d+)\s+empleados/,
      /(\d+)\s+empleados/,
      /(\d+)\s+employees/,
      /workforce\s+of\s+(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && !filters.nEmpleadosMin && !filters.nEmpleadosMax) {
        const count = parseInt(match[1]);
        // If exact count, use a small range
        filters.nEmpleadosMin = (count - 5).toString();
        filters.nEmpleadosMax = (count + 5).toString();
        break;
      }
    }
  }

  private static extractYear(query: string, filters: SearchFilters): void {
    const yearPatterns = [
      /año\s+(\d{4})/,
      /year\s+(\d{4})/,
      /del?\s+(\d{4})/,
      /from\s+(\d{4})/,
      /en\s+(\d{4})/,
      /in\s+(\d{4})/,
      /(\d{4})/,
    ];

    for (const pattern of yearPatterns) {
      const match = query.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 2000 && year <= new Date().getFullYear()) {
          filters.anio = year.toString();
          break;
        }
      }
    }
  }

  private static extractProfitability(query: string, filters: SearchFilters): void {
    const profitablePatterns = [
      /rentables?/,
      /profitable/,
      /con\s+utilidades?/,
      /with\s+profits?/,
      /ganancia/,
      /earnings/,
    ];

    const unprofitablePatterns = [
      /no\s+rentables?/,
      /unprofitable/,
      /con\s+pérdidas?/,
      /with\s+losses?/,
      /perdiendo/,
      /losing/,
    ];

    for (const pattern of profitablePatterns) {
      if (query.match(pattern)) {
        filters.utilidadNetaMin = '1';
        break;
      }
    }

    for (const pattern of unprofitablePatterns) {
      if (query.match(pattern)) {
        filters.utilidadNetaMax = '0';
        break;
      }
    }

    // Specific profit amount patterns
    const profitAmountPatterns = [
      /utilidad\s+superior\s+a\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)/,
      /profit\s+over\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)/,
      /ganancias?\s+de\s+más\s+de\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)/,
    ];

    for (const pattern of profitAmountPatterns) {
      const match = query.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        filters.utilidadNetaMin = amount.toString();
        break;
      }
    }
  }

  private static extractCompanyIdentifiers(query: string, filters: SearchFilters): void {
    // RUC pattern (Ecuador format: 13 digits)
    const rucPattern = /\b(\d{13})\b/;
    const rucMatch = query.match(rucPattern);
    if (rucMatch) {
      filters.ruc = rucMatch[1];
    }

    // Company name patterns
    const namePatterns = [
      /empresa\s+"([^"]+)"/,
      /company\s+"([^"]+)"/,
      /"([^"]+)"\s+empresa/,
      /"([^"]+)"\s+company/,
      /llamada\s+"([^"]+)"/,
      /named\s+"([^"]+)"/,
    ];

    for (const pattern of namePatterns) {
      const match = query.match(pattern);
      if (match) {
        filters.nombre = match[1];
        break;
      }
    }

    // Commercial name patterns
    const commercialNamePatterns = [
      /comercial\s+"([^"]+)"/,
      /comercialmente\s+"([^"]+)"/,
      /conocida\s+como\s+"([^"]+)"/,
      /known\s+as\s+"([^"]+)"/,
    ];

    for (const pattern of commercialNamePatterns) {
      const match = query.match(pattern);
      if (match) {
        filters.nombreComercial = match[1];
        break;
      }
    }
  }

  /**
   * Generate a human-readable summary of the applied filters
   */
  static generateFilterSummary(filters: SearchFilters): string {
    const parts: string[] = [];
    
    // NEW: Add sector to summary
    if (filters.sector) {
      parts.push(`del sector ${filters.sector}`);
    } else if (filters.sectorText) {
      parts.push(`relacionadas con "${filters.sectorText}"`);
    }

    if (filters.provincia) {
      parts.push(`en ${filters.provincia}`);
    }

    if (filters.nEmpleadosMin || filters.nEmpleadosMax) {
      if (filters.nEmpleadosMin && filters.nEmpleadosMax) {
        parts.push(`con ${filters.nEmpleadosMin}-${filters.nEmpleadosMax} empleados`);
      } else if (filters.nEmpleadosMin) {
        parts.push(`con más de ${filters.nEmpleadosMin} empleados`);
      } else if (filters.nEmpleadosMax) {
        parts.push(`con hasta ${filters.nEmpleadosMax} empleados`);
      }
    }

    if (filters.ingresosVentasMin || filters.ingresosVentasMax) {
      if (filters.ingresosVentasMin && filters.ingresosVentasMax) {
        parts.push(`ingresos entre $${Number(filters.ingresosVentasMin).toLocaleString()} y $${Number(filters.ingresosVentasMax).toLocaleString()}`);
      } else if (filters.ingresosVentasMin) {
        parts.push(`ingresos superiores a $${Number(filters.ingresosVentasMin).toLocaleString()}`);
      } else if (filters.ingresosVentasMax) {
        parts.push(`ingresos hasta $${Number(filters.ingresosVentasMax).toLocaleString()}`);
      }
    }

    if (filters.utilidadNetaMin && Number(filters.utilidadNetaMin) > 0) {
      parts.push('rentables');
    } else if (filters.utilidadNetaMax && Number(filters.utilidadNetaMax) <= 0) {
      parts.push('con pérdidas');
    }

    if (filters.anio) {
      parts.push(`del año ${filters.anio}`);
    }

    if (filters.nombre) {
      parts.push(`con nombre "${filters.nombre}"`);
    }

    if (filters.nombreComercial) {
      parts.push(`conocidas como "${filters.nombreComercial}"`);
    }

    if (filters.ruc) {
      parts.push(`con RUC ${filters.ruc}`);
    }

    // Sorting summary
    if (filters.sortBy) {
      if (filters.sortBy === 'completitud') {
        parts.push('ordenadas por relevancia');
      } else {
        const dirLabel = filters.sortDir === 'asc' ? 'ascendente' : 'descendente';
        const fieldMap: Record<string, string> = {
          ingresos_ventas: 'ingresos',
          n_empleados: 'número de empleados',
          utilidad_neta: 'utilidad neta',
          activos: 'activos',
          anio: 'año',
        };
        const fieldLabel = fieldMap[filters.sortBy] || filters.sortBy;
        parts.push(`ordenadas por ${fieldLabel} (${dirLabel})`);
      }
    }

    return parts.length > 0 ? `Empresas ${parts.join(', ')}` : 'Todas las empresas';
  }

  /**
   * Validate and normalize filter values
   */
  static validateFilters(filters: SearchFilters): SearchFilters {
    const validated: SearchFilters = {};

    // Copy string filters as-is after basic validation
    if (filters.ruc && /^\d+$/.test(filters.ruc)) {
      validated.ruc = filters.ruc;
    }

    if (filters.nombre && filters.nombre.length >= 2) {
      validated.nombre = filters.nombre;
    }

    if (filters.nombreComercial && filters.nombreComercial.length >= 2) {
      validated.nombreComercial = filters.nombreComercial;
    }

    if (filters.provincia && Object.values(PROVINCE_MAPPING).includes(filters.provincia)) {
      validated.provincia = filters.provincia;
    }

    // Validate numeric filters
    const numericFields = [
      'anio', 'nEmpleadosMin', 'nEmpleadosMax', 'ingresosVentasMin', 'ingresosVentasMax',
      'activosMin', 'activosMax', 'patrimonioMin', 'patrimonioMax', 'impuestoRentaMin',
      'impuestoRentaMax', 'utilidadAnImpMin', 'utilidadAnImpMax', 'utilidadNetaMin', 'utilidadNetaMax'
    ] as const;

    for (const field of numericFields) {
      if (filters[field] !== undefined) {
        const value = Number(filters[field]);
        if (!isNaN(value) && isFinite(value)) {
          validated[field] = value.toString();
        }
      }
    }

    // Validate sort fields
    const allowedSortBy: Array<NonNullable<SearchFilters['sortBy']>> = ['completitud','ingresos_ventas','n_empleados','utilidad_neta','activos','anio'];
    if (filters.sortBy && allowedSortBy.includes(filters.sortBy)) {
      validated.sortBy = filters.sortBy;
    }
    if (filters.sortDir && (filters.sortDir === 'asc' || filters.sortDir === 'desc')) {
      validated.sortDir = filters.sortDir;
    }

    // Normalize gating flags as 'true' string or undefined
    if (filters.requireIngresos === 'true') {
      validated.requireIngresos = 'true';
    }
    if (filters.requireEmpleados === 'true') {
      validated.requireEmpleados = 'true';
    }
    
    // NEW: Validate and pass through sector filters
    if (filters.sector && typeof filters.sector === 'string' && filters.sector.length >= 2) {
      validated.sector = filters.sector;
    }
    if (filters.sectorText && typeof filters.sectorText === 'string' && filters.sectorText.length >= 2) {
      validated.sectorText = filters.sectorText;
    }
    if (filters.sectorKeywords && Array.isArray(filters.sectorKeywords) && filters.sectorKeywords.length > 0) {
      // Validate each keyword is a non-empty string
      validated.sectorKeywords = filters.sectorKeywords.filter(kw => 
        typeof kw === 'string' && kw.length >= 2
      );
    }
    if (filters.sectorCIIU && Array.isArray(filters.sectorCIIU) && filters.sectorCIIU.length > 0) {
      // Validate CIIU codes (should be alphanumeric)
      validated.sectorCIIU = filters.sectorCIIU.filter(code => 
        typeof code === 'string' && /^[A-Z]\d{0,4}$/i.test(code)
      );
    }

    return validated;
  }
}
