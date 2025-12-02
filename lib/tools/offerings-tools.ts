import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { UserOffering } from '@/types/user-offering';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Detect if we're running in a background task (Trigger.dev worker)
 * by checking for the absence of cookies/request context
 */
function isBackgroundTask(): boolean {
  try {
    return typeof process !== 'undefined' && 
           process.env.TRIGGER_PROJECT_ID !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get a Supabase client that works in both Next.js and Trigger.dev contexts
 * Returns { client, userId } - userId is null if auth lookup is needed externally
 */
async function getSupabaseClientWithAuth(providedUserId?: string): Promise<{
  client: SupabaseClient;
  userId: string | null;
  isBackground: boolean;
}> {
  // If in background task or userId is provided, use service role client
  if (isBackgroundTask() || providedUserId) {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const client = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    return { client, userId: providedUserId || null, isBackground: true };
  }

  // In Next.js context, use cookie-based client
  try {
    const { createClient: createNextClient } = await import('@/lib/supabase/server');
    const client = await createNextClient();
    
    // Try to get user from auth
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) {
      console.error('[getSupabaseClientWithAuth] Auth error:', error);
      return { client, userId: null, isBackground: false };
    }
    
    return { client, userId: user.id, isBackground: false };
  } catch {
    // Fallback if Next.js context fails (shouldn't happen but safe fallback)
    console.warn('[getSupabaseClientWithAuth] Next.js client failed, using service client');
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const client = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    return { client, userId: providedUserId || null, isBackground: true };
  }
}

/**
 * Fetch all user offerings from the database
 */
async function fetchUserOfferings(client: SupabaseClient, userId: string): Promise<UserOffering[]> {
  try {
    const { data: offerings, error } = await client
      .from('user_offerings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchUserOfferings] Error:', error);
      throw new Error(`Error al obtener ofertas: ${error.message}`);
    }

    return offerings || [];
  } catch (error) {
    console.error('[fetchUserOfferings] Error:', error);
    throw error;
  }
}

/**
 * Fetch a specific offering by ID (with user ownership verification)
 */
async function fetchOfferingById(client: SupabaseClient, offeringId: string, userId: string): Promise<UserOffering | null> {
  try {
    const { data: offering, error } = await client
      .from('user_offerings')
      .select('*')
      .eq('id', offeringId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[fetchOfferingById] Error:', error);
      throw new Error(`Error al obtener oferta: ${error.message}`);
    }

    return offering;
  } catch (error) {
    console.error('[fetchOfferingById] Error:', error);
    throw error;
  }
}

/**
 * Tool for listing all user offerings (lightweight summary)
 * 
 * In background tasks (Trigger.dev), the userId must be provided since there's no auth context.
 * The agent automatically injects userId from state when running in background mode.
 */
export const listUserOfferingsTool = tool(
  async ({ userId: providedUserId }: { userId?: string }) => {
    try {
      // Get Supabase client with auth (handles both Next.js and background contexts)
      const { client, userId, isBackground } = await getSupabaseClientWithAuth(providedUserId);
      
      if (!userId) {
        console.error('[listUserOfferingsTool] No userId available');
        return {
          success: false,
          error: isBackground 
            ? 'userId es requerido en tareas de fondo. El agente debe proporcionar el userId.'
            : 'No se pudo autenticar al usuario',
          suggestion: isBackground
            ? 'Asegúrate de que el agente proporcione el userId del contexto del usuario.'
            : 'Por favor, inicia sesión para ver tus servicios.',
        };
      }
      
      console.log('[listUserOfferingsTool] Fetching offerings for user:', userId, '(background:', isBackground, ')');
      
      const offerings = await fetchUserOfferings(client, userId);
      
      if (offerings.length === 0) {
        return {
          success: true,
          offerings: [],
          count: 0,
          summary: 'No tienes servicios registrados en tu portafolio todavía.',
          suggestion: 'Puedes crear nuevos servicios en la sección de Ofertas para que el agente pueda ayudarte a promocionarlos.',
        };
      }

      // Create lightweight summaries for context
      const offeringSummaries = offerings.map(o => ({
        id: o.id,
        offering_name: o.offering_name,
        industry: o.industry,
        industry_targets: o.industry_targets || [],
        payment_type: o.payment_type,
        description_preview: o.description ? o.description.substring(0, 100) + (o.description.length > 100 ? '...' : '') : null,
        has_price_plans: !!(o.price_plans && Array.isArray(o.price_plans) && o.price_plans.length > 0),
        is_public: o.is_public,
        created_at: o.created_at,
      }));

      // Aggregate statistics
      const uniqueTargetIndustries = [...new Set(offerings.flatMap(o => o.industry_targets || []))];
      const byIndustry = offerings.reduce((acc, o) => {
        const industry = o.industry || 'Sin especificar';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        offerings: offeringSummaries,
        count: offerings.length,
        summary: `Tienes ${offerings.length} ${offerings.length === 1 ? 'servicio registrado' : 'servicios registrados'} en tu portafolio.`,
        statistics: {
          total: offerings.length,
          by_industry: byIndustry,
          target_industries: uniqueTargetIndustries,
          public_count: offerings.filter(o => o.is_public).length,
          with_pricing: offerings.filter(o => o.price_plans && Array.isArray(o.price_plans) && o.price_plans.length > 0).length,
        },
      };
      
    } catch (error) {
      console.error('[listUserOfferingsTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al obtener ofertas',
        suggestion: 'Verifica que tienes permisos para acceder a tus servicios.',
      };
    }
  },
  {
    name: 'list_user_offerings',
    description: `Lista todos los servicios/productos del usuario registrados en su portafolio.

Esta herramienta devuelve un resumen ligero de todas las ofertas del usuario, incluyendo:
- Nombre del servicio
- Industria y sectores objetivo
- Tipo de pago (única o suscripción)
- Vista previa de descripción
- Estadísticas agregadas

Úsala para:
- Obtener contexto sobre qué servicios ofrece el usuario
- Identificar qué offering promocionar al buscar empresas
- Responder preguntas como "¿qué servicios tengo?" o "muéstrame mi portafolio"
- Antes de buscar empresas, para conocer los sectores objetivo del usuario

NO necesitas esta herramienta si el contexto ya incluye información básica de offerings.

PARÁMETROS:
- userId (opcional): En contextos de tarea de fondo (Trigger.dev), debes proporcionar el userId del contexto del usuario.
  En contextos web normales, se identifica automáticamente desde la sesión.`,
    schema: z.object({
      userId: z.string().optional().describe('ID del usuario. Requerido en tareas de fondo (Trigger.dev). El agente lo obtiene del contexto del usuario (userContext.userId).'),
    }),
  }
);

/**
 * Tool for getting detailed information about a specific offering
 * 
 * In background tasks (Trigger.dev), the userId must be provided since there's no auth context.
 * The agent automatically injects userId from state when running in background mode.
 */
export const getOfferingDetailsTool = tool(
  async ({ offeringId, userId: providedUserId }: { offeringId: string; userId?: string }) => {
    try {
      // Get Supabase client with auth (handles both Next.js and background contexts)
      const { client, userId, isBackground } = await getSupabaseClientWithAuth(providedUserId);
      
      if (!userId) {
        console.error('[getOfferingDetailsTool] No userId available');
        return {
          success: false,
          error: isBackground 
            ? 'userId es requerido en tareas de fondo. El agente debe proporcionar el userId.'
            : 'No se pudo autenticar al usuario',
          suggestion: isBackground
            ? 'Asegúrate de que el agente proporcione el userId del contexto del usuario.'
            : 'Por favor, inicia sesión para ver los detalles del servicio.',
        };
      }
      
      console.log('[getOfferingDetailsTool] Fetching offering:', offeringId, 'for user:', userId, '(background:', isBackground, ')');
      
      const offering = await fetchOfferingById(client, offeringId, userId);
      
      if (!offering) {
        return {
          success: false,
          error: 'Servicio no encontrado',
          suggestion: 'Verifica el ID del servicio. Usa list_user_offerings para ver todos tus servicios disponibles.',
        };
      }

      // Parse and format price plans
      let pricingInfo = null;
      if (offering.price_plans && Array.isArray(offering.price_plans) && offering.price_plans.length > 0) {
        pricingInfo = {
          payment_type: offering.payment_type || 'subscription',
          plans: offering.price_plans.map((plan: any) => ({
            name: plan.name || plan.tier,
            price: plan.price,
            period: plan.period,
            currency: plan.currency || 'USD',
            description: plan.description,
            features: plan.features,
          })),
          has_multiple_tiers: offering.price_plans.length > 1,
        };
      }

      // Format social media links
      let socialMedia = null;
      if (offering.social_media_links && Array.isArray(offering.social_media_links) && offering.social_media_links.length > 0) {
        socialMedia = offering.social_media_links.map((link: any) => ({
          platform: link.platform,
          url: link.url,
        }));
      }

      // Format documentation URLs
      let documentation = null;
      if (offering.documentation_urls && Array.isArray(offering.documentation_urls) && offering.documentation_urls.length > 0) {
        documentation = offering.documentation_urls.map((doc: any) => ({
          url: doc.url,
          description: doc.description,
        }));
      }

      // Build comprehensive response
      const detailedInfo = {
        id: offering.id,
        offering_name: offering.offering_name,
        description: offering.description,
        industry: offering.industry,
        industry_targets: offering.industry_targets || [],
        pricing: pricingInfo,
        website_url: offering.website_url,
        social_media: socialMedia,
        documentation: documentation,
        is_public: offering.is_public,
        public_slug: offering.public_slug,
        public_contact: offering.is_public ? {
          company_name: offering.public_company_name,
          contact_name: offering.public_contact_name,
          contact_email: offering.public_contact_email,
          contact_phone: offering.public_contact_phone,
        } : null,
        created_at: offering.created_at,
        updated_at: offering.updated_at,
      };

      // Generate value proposition summary
      const valueProps: string[] = [];
      if (offering.description) {
        valueProps.push(`Propuesta de valor: ${offering.description}`);
      }
      if (pricingInfo) {
        const priceDisplay = pricingInfo.plans.length === 1 
          ? `$${pricingInfo.plans[0].price}${pricingInfo.payment_type === 'subscription' ? `/${pricingInfo.plans[0].period || 'mes'}` : ''}`
          : `Desde $${Math.min(...pricingInfo.plans.map((p: any) => p.price))}`;
        valueProps.push(`Precio: ${priceDisplay}`);
      }
      if (offering.industry_targets && offering.industry_targets.length > 0) {
        valueProps.push(`Sectores objetivo: ${offering.industry_targets.join(', ')}`);
      }

      return {
        success: true,
        offering: detailedInfo,
        summary: `Servicio "${offering.offering_name}" en la industria ${offering.industry || 'no especificada'}`,
        value_proposition: valueProps.join('\n'),
        usage_suggestions: [
          'Usa esta información para personalizar emails de prospección',
          'Menciona características específicas al contactar empresas de los sectores objetivo',
          pricingInfo ? 'Incluye información de precios cuando sea relevante para el prospecto' : null,
          offering.website_url ? 'Incluye el enlace web para más información' : null,
        ].filter(Boolean),
      };
      
    } catch (error) {
      console.error('[getOfferingDetailsTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al obtener detalles del servicio',
        suggestion: 'Verifica que el ID del servicio es correcto y que tienes permisos para acceder.',
      };
    }
  },
  {
    name: 'get_offering_details',
    description: `Obtiene información detallada y completa sobre un servicio/producto específico del usuario.

Esta herramienta devuelve toda la información disponible del servicio:
- Nombre y descripción completa
- Industria y todos los sectores objetivo
- Planes de precios detallados (si existen)
- Website, redes sociales y documentación
- Información de contacto público (si está compartido)

Úsala para:
- Obtener mas contexto del servicio/producto que el usuario quiere ofrecer
- Redactar emails personalizados que mencionen características específicas del servicio
- Obtener contexto completo antes de hacer un pitch de venta
- Responder preguntas detalladas sobre un servicio específico
- Preparar propuestas de valor para prospectos

Cuándo NO usarla:
- Si solo necesitas un resumen general (usa list_user_offerings)
- Si la información básica del contexto es suficiente

Después de obtener los detalles, úsalos para:
- Personalizar el mensaje según el sector de la empresa prospecto
- Mencionar características relevantes para las necesidades del prospecto
- Incluir precios y enlaces apropiados

PARÁMETROS:
- offeringId (requerido): ID (UUID) del servicio/producto a consultar. Obtén este ID del contexto del usuario o de list_user_offerings.
- userId (opcional): En contextos de tarea de fondo (Trigger.dev), debes proporcionar el userId del contexto del usuario.
  En contextos web normales, se identifica automáticamente desde la sesión.`,
    schema: z.object({
      offeringId: z.string().describe('ID (UUID) del servicio/producto a consultar. Obtén este ID del contexto del usuario o de list_user_offerings.'),
      userId: z.string().optional().describe('ID del usuario. Requerido en tareas de fondo (Trigger.dev). El agente lo obtiene del contexto del usuario (userContext.userId).'),
    }),
  }
);

/**
 * Export all offering tools as an array
 */
export const offeringTools = [
  listUserOfferingsTool,
  getOfferingDetailsTool,
];

