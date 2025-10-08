import { NextRequest, NextResponse } from 'next/server';
import { exportCompaniesToExcel } from '@/app/actions/export-companies';
import { createClient } from '@/lib/supabase/server';
import { ensureExportAllowedAndIncrement } from '@/lib/usage';
import { getUserSubscription } from '@/lib/subscription';
import { getPlansWithLimits } from '@/lib/plans';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user at route level
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limiting for exports
    const rateLimitResult = await ensureExportAllowedAndIncrement(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Export limit reached', 
          message: 'You have reached your monthly export limit. Please upgrade your plan or try again next month.',
          remaining: rateLimitResult.remaining 
        },
        { status: 429 }
      );
    }

    // Get user's plan and export size limits
    const subscription = await getUserSubscription(user.id);
    const plan = (subscription?.plan as 'FREE' | 'PRO' | 'ENTERPRISE') || 'FREE';
    
    const plans = await getPlansWithLimits();
    const userPlan = plans.find(p => p.id === plan);
    const maxCompaniesPerExport = userPlan?.limits.companies_per_export || 0;
    
    // FREE plan cannot export
    if (plan === 'FREE') {
      return NextResponse.json(
        { 
          error: 'Export not available', 
          message: 'Exporting is not available on the FREE plan. Please upgrade to PRO or ENTERPRISE to export data.',
          plan: plan
        },
        { status: 403 }
      );
    }

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

    // Generate Excel file with progress tracking and size limit
    const { buffer, filename, mimeType, recordCount } = await exportCompaniesToExcel(params, sessionId, maxCompaniesPerExport);
    
    // Verify the export didn't exceed limits (double-check after export)
    if (maxCompaniesPerExport > 0 && recordCount > maxCompaniesPerExport) {
      return NextResponse.json(
        { 
          error: 'Export size limit exceeded', 
          message: `Your plan allows up to ${maxCompaniesPerExport} companies per export, but ${recordCount} were requested. Please refine your filters or upgrade your plan.`,
          plan: plan,
          limit: maxCompaniesPerExport,
          requested: recordCount
        },
        { status: 403 }
      );
    }

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
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message.includes('Export limit reached')) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to export companies', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}