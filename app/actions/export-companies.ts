'use server';

import * as XLSX from 'xlsx';
import { fetchCompanies } from '@/lib/data/companies';
import { Company } from '@/types/company';
import { ensureExportAllowedAndIncrement } from '@/lib/usage';
import { createClient } from '@/lib/supabase/server';

// Define the search parameters interface to match the one in companies.ts
interface ExportSearchParams {
  page?: string;
  ruc?: string;
  nombre?: string;
  provincia?: string;
  anio?: string;
  nEmpleadosMin?: string;
  nEmpleadosMax?: string;
  ingresosVentasMin?: string;
  ingresosVentasMax?: string;
  activosMin?: string;
  activosMax?: string;
  patrimonioMin?: string;
  patrimonioMax?: string;
  impuestoRentaMin?: string;
  impuestoRentaMax?: string;
  utilidadAnImpMin?: string;
  utilidadAnImpMax?: string;
  utilidadNetaMin?: string;
  utilidadNetaMax?: string;
  nombreComercial?: string;
}

// Transform Company data to Excel-friendly format
function transformCompanyForExcel(company: Company) {
  return {
    'RUC': company.ruc || '',
    'Nombre': company.nombre || '',
    'Provincia': company.provincia || '',
    'Año': company.anio || '',
    'Ingresos Ventas': company.ingresos_ventas || 0,
    'Activos': company.activos || 0,
    'Patrimonio': company.patrimonio || 0,
    'Utilidad Antes Impuestos': company.utilidad_an_imp || 0,
    'Utilidad Neta': company.utilidad_neta || 0,
    'Impuesto Renta': company.impuesto_renta || 0,
    'N° Empleados': company.n_empleados || 0,
    'Director Nombre': company.director_representante || company.director_nombre || '',
    'Director Cargo': company.director_cargo || '',
    'Director Teléfono': company.director_telefono || '',
  };
}

async function fetchAllCompaniesInBatches(searchParams: ExportSearchParams, sessionId?: string) {
  const BATCH_SIZE = 1000; // Supabase limit
  let allCompanies: Company[] = [];
  let currentPage = 1;
  let hasMoreData = true;

  console.log('Starting batch fetch process...');

  // Import progress tracking functions
  let updateProgress: ((sessionId: string, fetched: number, total: number) => void) | undefined;
  
  try {
    const progressModule = await import('@/lib/progress-tracker');
    updateProgress = progressModule.updateProgress;
  } catch (err) {
    console.log('Progress tracking not available:', err);
  }

  while (hasMoreData) {
    console.log(`Fetching batch ${currentPage} (records ${(currentPage - 1) * BATCH_SIZE + 1}-${currentPage * BATCH_SIZE})...`);
    
    // Fetch current batch with pagination
    const { companies, totalCount } = await fetchCompanies({ 
      ...searchParams, 
      page: currentPage.toString(),
      pageSize: BATCH_SIZE, // Use 1000 records per batch
      exportAll: false // Use normal pagination
    });

    if (companies && companies.length > 0) {
      allCompanies = allCompanies.concat(companies);
      console.log(`Batch ${currentPage} fetched: ${companies.length} records. Total so far: ${allCompanies.length}`);
      
      // Update progress if tracking is available
      if (updateProgress && sessionId && totalCount > 0) {
        updateProgress(sessionId, allCompanies.length, totalCount);
      }
      
      // Check if we have more data to fetch
      hasMoreData = allCompanies.length < totalCount && companies.length === BATCH_SIZE;
      currentPage++;
    } else {
      hasMoreData = false;
    }
  }

  console.log(`Batch fetch completed. Total records: ${allCompanies.length}`);
  return allCompanies;
}

export async function exportCompaniesToExcel(searchParams: ExportSearchParams = {}, sessionId?: string) {
  try {
    // Check rate limiting for exports
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required for export');
    }

    const rateLimitResult = await ensureExportAllowedAndIncrement(user.id);
    if (!rateLimitResult.allowed) {
      throw new Error('Export limit reached. Please upgrade your plan or try again later.');
    }

    // Fetch all companies in batches to bypass Supabase 1000 row limit
    const companies = await fetchAllCompaniesInBatches(searchParams, sessionId);
    
    console.log('Total companies fetched:', companies.length);
    console.log('Search params:', searchParams);
    
    if (!companies || companies.length === 0) {
      throw new Error('No companies found to export');
    }

    // Debug: Check director fields in the first few companies
    console.log('Director fields sample:', companies.slice(0, 3).map(c => ({
      nombre: c.nombre,
      director_nombre: c.director_nombre,
      director_representante: c.director_representante,
      director_cargo: c.director_cargo
    })));

    // Transform data for Excel
    console.log('Starting Excel data transformation...');
    const excelData = companies.map(transformCompanyForExcel);
    
    console.log('Excel data sample:', excelData.slice(0, 2));
    console.log('Excel data length:', excelData.length);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // RUC
      { wch: 35 }, // Nombre
      { wch: 15 }, // Provincia
      { wch: 8 },  // Año
      { wch: 18 }, // Ingresos Ventas
      { wch: 18 }, // Activos
      { wch: 18 }, // Patrimonio
      { wch: 20 }, // Utilidad Antes Impuestos
      { wch: 15 }, // Utilidad Neta
      { wch: 15 }, // Impuesto Renta
      { wch: 12 }, // N° Empleados
      { wch: 30 }, // Director Nombre
      { wch: 25 }, // Director Cargo
      { wch: 15 }, // Director Teléfono
    ];

    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    const worksheetName = 'Empresas';
    XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);

    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const hasFilters = Object.values(searchParams).some(value => value && value.trim() !== '');
    const filename = hasFilters 
      ? `empresas-filtradas-${currentDate}.xlsx`
      : `empresas-completas-${currentDate}.xlsx`;

    return {
      buffer,
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      recordCount: companies.length
    };

  } catch (error) {
    console.error('Error exporting companies to Excel:', error);
    throw new Error(`Failed to export companies: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}