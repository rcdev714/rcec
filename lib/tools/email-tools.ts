import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Company } from '@/types/company';
import { Director } from '@/types/director';
import { UserOffering } from '@/types/user-offering';

/**
 * Email draft generation tool
 * Creates personalized sales email drafts based on company context and user offerings
 * NEVER sends emails automatically - only creates drafts
 */
export const generateSalesEmailTool = tool(
  async ({ 
    companyContext, 
    contactInfo, 
    userOffering,
    tone = 'professional',
    language = 'spanish'
  }: {
    companyContext: Company;
    contactInfo?: Director;
    userOffering: UserOffering;
    tone?: string;
    language?: string;
  }) => {
    try {
      // Initialize Gemini model
      const model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || '',
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
        temperature: 0.7,
        maxOutputTokens: 1024,
      });

      // Build context for email generation
      const companyInfo = `
Empresa: ${companyContext.nombre || companyContext.nombre_comercial || 'No especificado'}
Nombre Comercial: ${companyContext.nombre_comercial || companyContext.nombre || ''}
Provincia: ${companyContext.provincia || 'No especificado'}
Industria: ${companyContext.ciiu || 'No especificado'}
Empleados: ${companyContext.n_empleados || 'No especificado'}
Ingresos: ${companyContext.ingresos_ventas ? `$${companyContext.ingresos_ventas.toLocaleString()}` : 'No especificado'}
`.trim();

      const contactName = contactInfo?.nombre || contactInfo?.representante || 'Estimado/a';
      const contactPosition = contactInfo?.cargo || '';

      const offeringInfo = `
Producto/Servicio: ${userOffering.offering_name || 'No especificado'}
Descripción: ${userOffering.description || 'No especificado'}
Industria: ${userOffering.industry || 'No especificado'}
Industrias Objetivo: ${userOffering.industry_targets?.join(', ') || 'No especificado'}
Sitio Web: ${userOffering.website_url || 'No especificado'}
`.trim();

      const prompt = `Eres un experto en redacción de emailsq de ventas B2B en español. Genera un email profesional y personalizado.

CONTEXTO DE LA EMPRESA OBJETIVO:
${companyInfo}

CONTACTO:
Nombre: ${contactName}
${contactPosition ? `Cargo: ${contactPosition}` : ''}

TU PRODUCTO/SERVICIO:
${offeringInfo}

INSTRUCCIONES:
1. Tono: ${tone === 'professional' ? 'Profesional y respetuoso' : tone === 'friendly' ? 'Amigable pero profesional' : 'Formal'}
2. Idioma: ${language === 'spanish' ? 'Español' : language}
3. Longitud: Conciso (150-250 palabras)
4. Estructura:
   - Saludo personalizado
   - Breve introducción (quién eres)
   - Valor específico para esta empresa (basado en su industria/tamaño)
   - Call to action claro
   - Cierre profesional
5. Personalización: Menciona algo específico de la empresa (ubicación, industria, tamaño)
6. NO uses lenguaje genérico o spam
7. NO hagas promesas exageradas
8. SÉ específico sobre el valor que ofreces

FORMATO DE SALIDA:
Devuelve SOLO un objeto JSON con esta estructura exacta:
{
  "subject": "Asunto del email (máximo 60 caracteres)",
  "body": "Cuerpo del email con saltos de línea apropiados"
}

NO incluyas ningún texto adicional fuera del JSON.`;

      const response = await model.invoke(prompt);
      const content = response.content.toString();
      
      // Try to extract JSON from response
      let emailData;
      try {
        // Try direct JSON parse
        emailData = JSON.parse(content);
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          emailData = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find JSON object in the text
          const objectMatch = content.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
          if (objectMatch) {
            emailData = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('No se pudo extraer JSON de la respuesta');
          }
        }
      }

      // Validate structure
      if (!emailData.subject || !emailData.body) {
        throw new Error('El formato del email generado es inválido');
      }

      return {
        success: true,
        draft: {
          subject: emailData.subject,
          body: emailData.body,
          toName: contactName,
          toEmail: null, // Director type doesn't have email field - contact enrichment needed
          companyName: companyContext.nombre || companyContext.nombre_comercial,
          generatedAt: new Date().toISOString(),
        },
        metadata: {
          tone,
          language,
          companyProvince: companyContext.provincia,
          offeringName: userOffering.offering_name,
        },
        warning: 'IMPORTANTE: El email de contacto debe ser enriquecido mediante herramientas web antes de enviar.',
      };
    } catch (error) {
      console.error('Email generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al generar email',
        draft: null,
      };
    }
  },
  {
    name: 'generate_sales_email',
    description: `Generar un borrador de email de ventas personalizado basado en el contexto de la empresa objetivo y tu producto/servicio.

IMPORTANTE: Esta herramienta SOLO genera borradores. NUNCA envía emails automáticamente.

Inputs necesarios:
- companyContext: Información de la empresa objetivo (nombre, industria, tamaño, ubicación)
- userOffering: Tu producto/servicio (nombre, descripción, industrias objetivo)
- contactInfo (opcional): Información del contacto (nombre, cargo, email)
- tone (opcional): 'professional' (default), 'friendly', 'formal'
- language (opcional): 'spanish' (default)

Output:
- draft: Objeto con subject y body del email
- metadata: Información adicional sobre el email generado
- warning: Advertencias importantes (ej: validar email)

Mejores prácticas:
1. Asegúrate de tener información completa de la empresa antes de generar
2. Si no tienes contactInfo, el email será genérico
3. Siempre valida el email del destinatario antes de enviar
4. Revisa y ajusta el borrador según sea necesario
5. Nunca envíes emails sin revisión humana

Ejemplo de uso:
{
  "companyContext": {
    "nombre": "Corporación Favorita",
    "provincia": "PICHINCHA",
    "n_empleados": 5000,
    "ciiu": "Comercio al por menor"
  },
  "contactInfo": {
    "name": "Juan Pérez",
    "position": "Gerente de Compras"
  },
  "userOffering": {
    "offering_name": "Sistema de Gestión de Inventarios",
    "description": "Software cloud para optimizar inventarios",
    "industry_targets": ["Retail", "Comercio"]
  }
}`,
    schema: z.object({
      companyContext: z.object({
        nombre: z.string().optional(),
        name: z.string().optional(),
        nombreComercial: z.string().optional(),
        provincia: z.string().optional(),
        ciiu: z.string().optional(),
        industry: z.string().optional(),
        n_empleados: z.number().optional(),
        empleados: z.number().optional(),
        ingresos_ventas: z.number().optional(),
      }).describe('Contexto de la empresa objetivo'),
      contactInfo: z.object({
        name: z.string().optional(),
        representante: z.string().optional(),
        position: z.string().optional(),
        cargo: z.string().optional(),
        email: z.string().optional(),
      }).optional().describe('Información del contacto (opcional)'),
      userOffering: z.object({
        offering_name: z.string().optional(),
        offeringName: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional(),
        industry_targets: z.array(z.string()).optional(),
        website_url: z.string().optional(),
      }).describe('Tu producto/servicio'),
      tone: z.enum(['professional', 'friendly', 'formal']).optional().default('professional').describe('Tono del email'),
      language: z.enum(['spanish', 'english']).optional().default('spanish').describe('Idioma del email'),
    }),
  }
);

