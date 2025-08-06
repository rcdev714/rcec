import { NextRequest, NextResponse } from 'next/server';
import { exportCompaniesToExcel } from '@/app/actions/export-companies';

export async function GET(request: NextRequest) {
  try {
    // Extract search parameters from the URL
    const searchParams = request.nextUrl.searchParams;
    
    const sessionId = searchParams.get('sessionId') || undefined;
    
    const params = {
      ruc: searchParams.get('ruc') || undefined,
      nombre: searchParams.get('nombre') || undefined,
      provincia: searchParams.get('provincia') || undefined,
      anio: searchParams.get('anio') || undefined,
      nEmpleadosMin: searchParams.get('nEmpleadosMin') || undefined,
      nEmpleadosMax: searchParams.get('nEmpleadosMax') || undefined,
      ingresosVentasMin: searchParams.get('ingresosVentasMin') || undefined,
      ingresosVentasMax: searchParams.get('ingresosVentasMax') || undefined,
      activosMin: searchParams.get('activosMin') || undefined,
      activosMax: searchParams.get('activosMax') || undefined,
      patrimonioMin: searchParams.get('patrimonioMin') || undefined,
      patrimonioMax: searchParams.get('patrimonioMax') || undefined,
      impuestoRentaMin: searchParams.get('impuestoRentaMin') || undefined,
      impuestoRentaMax: searchParams.get('impuestoRentaMax') || undefined,
      utilidadAnImpMin: searchParams.get('utilidadAnImpMin') || undefined,
      utilidadAnImpMax: searchParams.get('utilidadAnImpMax') || undefined,
      utilidadNetaMin: searchParams.get('utilidadNetaMin') || undefined,
      utilidadNetaMax: searchParams.get('utilidadNetaMax') || undefined,
      nombreComercial: searchParams.get('nombreComercial') || undefined,
    };

    // Generate Excel file with progress tracking
    const { buffer, filename, mimeType } = await exportCompaniesToExcel(params, sessionId);

    // Create response with proper headers for file download
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

    return response;

  } catch (error) {
    console.error('API Export error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to export companies', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}