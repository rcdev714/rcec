import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Contact enrichment tool
 * Attempts to find contact information for company executives
 * Uses safe, ethical methods and never invents information
 */
export const enrichCompanyContactsTool = tool(
  async ({ companyName, domain, position }: { companyName: string; domain?: string; position?: string }) => {
    try {
      // This is a placeholder implementation
      // In production, you would integrate with:
      // 1. Your directors table in Supabase
      // 2. LinkedIn API (if available)
      // 3. Other ethical contact enrichment services
      
      // For now, we'll check the directors table
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      // Search in directors table
      const query = supabase
        .from('directors')
        .select('*')
        .ilike('nombre', `%${companyName}%`)
        .limit(5);
      
      const { data: directors, error } = await query;
      
      if (error) {
        console.error('Error fetching directors:', error);
        return {
          success: false,
          error: 'Error al buscar información de contacto',
          contacts: [],
        };
      }
      
      // Format contacts
      const contacts = (directors || []).map((director) => ({
        name: director.representante || 'No disponible',
        position: director.cargo || position || 'No especificado',
        phone: director.telefono || null,
        email: null, // We don't have emails in the directors table
        source: 'database',
        confidence: director.representante ? 0.8 : 0.5,
        company: director.nombre,
        ruc: director.ruc,
      }));
      
      // If no contacts found, provide guidance
      if (contacts.length === 0) {
        return {
          success: true,
          contacts: [],
          message: `No se encontraron contactos en la base de datos para "${companyName}". Sugerencias:
- Usar web_search para buscar en LinkedIn: "LinkedIn ${position || 'gerente'} ${companyName}"
- Buscar el sitio web de la empresa: "contacto ${companyName} Ecuador"
- Verificar si el nombre de la empresa es correcto`,
          suggestions: [
            `web_search: "LinkedIn ${position || 'CEO gerente'} ${companyName} Ecuador"`,
            `web_search: "contacto email ${companyName} Ecuador"`,
            domain ? `web_search: "site:${domain} contacto"` : null,
          ].filter(Boolean),
        };
      }
      
      return {
        success: true,
        contacts,
        count: contacts.length,
        message: `Se encontraron ${contacts.length} contacto(s) en la base de datos.`,
        note: 'Nota: Los emails no están disponibles en nuestra base de datos. Considera usar web_search para encontrar información de contacto actualizada.',
      };
    } catch (error) {
      console.error('Contact enrichment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al enriquecer contactos',
        contacts: [],
      };
    }
  },
  {
    name: 'enrich_company_contacts',
    description: `Buscar información de contacto de ejecutivos y representantes de empresas. 

Capacidades:
- Buscar en la base de datos de directores
- Proporcionar nombres, cargos y teléfonos cuando estén disponibles
- Sugerir búsquedas web complementarias para información adicional

Limitaciones:
- NO inventa emails ni información de contacto
- Los emails generalmente no están disponibles en la base de datos
- Siempre sugiere validar la información antes de usar
- Respeta la privacidad y no hace scraping agresivo

Uso recomendado:
1. Primero usa esta herramienta para buscar en la base de datos
2. Si no hay resultados, usa web_search con las sugerencias proporcionadas
3. Siempre valida la información antes de usarla para contacto

Ejemplos:
- { companyName: "Corporación Favorita", position: "Gerente General" }
- { companyName: "Banco Pichincha", domain: "bancopichincha.com" }`,
    schema: z.object({
      companyName: z.string().describe('Nombre de la empresa para buscar contactos'),
      domain: z.string().optional().describe('Opcional: Dominio web de la empresa (ej: "empresa.com")'),
      position: z.string().optional().describe('Opcional: Cargo específico a buscar (ej: "CEO", "Gerente General")'),
    }),
  }
);

