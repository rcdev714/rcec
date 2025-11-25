export const CURRENT_TERMS_VERSION = '2025-11-25'

export type TermsSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Aceptación',
    paragraphs: [
      'Al hacer clic en "Aceptar y Continuar" o utilizar los servicios de Camella, usted (el "Usuario") acepta vincularse legalmente por estos términos con Camella. De conformidad con la Ley de Comercio Electrónico del Ecuador, este acuerdo tiene plena validez jurídica.',
      'El acceso a la plataforma se otorga exclusivamente a usuarios registrados y queda condicionado a la aceptación completa de estos Términos y de nuestra Política de Privacidad. Al presionar "Acepto" declaras que eres mayor de edad, cuentas con la autoridad necesaria para actuar a nombre de tu organización y utilizas la información de forma lícita.',
    ],
  },
  {
    title: '2. Descripción del servicio',
    paragraphs: [
      'Camella provee un software en la nube (SaaS) que funciona como un agente empresarial con inteligencia artificial. La plataforma consolida y normaliza datos corporativos de empresas ecuatorianas para ayudarte a investigar, auditar y conectar con empresas en América Latina.',
      'Nos reservamos el derecho de actualizar, modificar o descontinuar funciones del software con previo aviso razonable a través de la plataforma.',
    ],
    bullets: [
      'Motor de Ingesta Polimórfico: Normalizamos datos de múltiples fuentes oficiales en un formato unificado.',
      'Agente de Inteligencia Artificial: Asistente conversacional que ayuda a buscar, analizar y conectar con empresas.',
      'Base de datos empresarial: Acceso a información financiera, legal y de contacto de más de 300,000 empresas.',
    ],
  },
  {
    title: '3. Fuente de datos y responsabilidad',
    paragraphs: [
      'Toda la información de empresas disponible en Camella proviene directamente de la Superintendencia de Compañías, Valores y Seguros del Ecuador (Superintendencia de Compañías), que es el organismo oficial gubernamental responsable del registro y supervisión de empresas en Ecuador.',
      'Camella actúa únicamente como intermediario tecnológico que normaliza, estructura y presenta estos datos oficiales. No somos responsables por la exactitud, completitud o actualización de la información original, ya que esta es responsabilidad exclusiva de la Superintendencia de Compañías.',
    ],
    bullets: [
      'Cualquier queja, corrección o disputa relacionada con los datos de empresas debe ser dirigida directamente a la Superintendencia de Compañías.',
      'Camella no modifica ni altera los datos oficiales, solo los presenta en un formato más accesible y estructurado.',
      'Los datos financieros, legales y de contacto son los registrados oficialmente por las empresas ante la Superintendencia de Compañías.',
    ],
  },
  {
    title: '4. Inteligencia artificial y limitaciones',
    paragraphs: [
      'Camella utiliza tecnologías de inteligencia artificial (IA) para procesar consultas, generar análisis y facilitar la búsqueda de información. Es importante entender que la IA es una tecnología emergente y, por naturaleza, puede ser inconsistente o generar resultados que requieren verificación humana.',
      'Aunque trabajamos constantemente para mejorar la confiabilidad y precisión de nuestro agente de IA, reconocemos que:',
    ],
    bullets: [
      'Las respuestas generadas por IA pueden contener errores, imprecisiones o información desactualizada.',
      'La IA puede interpretar consultas de manera diferente en ocasiones similares.',
      'Los análisis y recomendaciones generados por IA deben ser verificados por el usuario antes de tomar decisiones comerciales importantes.',
      'No garantizamos la exactitud absoluta de las respuestas generadas por IA, aunque nos esforzamos por mantener altos estándares de calidad.',
      'El usuario es responsable de validar cualquier información crítica antes de utilizarla para decisiones comerciales, legales o financieras.',
    ],
  },
  {
    title: '5. Licencia de uso',
    paragraphs: [
      'Se otorga al Usuario una licencia no exclusiva, intransferible y revocable para usar el software únicamente para fines comerciales legítimos y de investigación empresarial. El Usuario no adquiere la propiedad intelectual del código fuente, la cual pertenece exclusivamente a Camella bajo el Código Orgánico de la Economía Social de los Conocimientos (COESCCI) de Ecuador.',
    ],
    bullets: [
      'No puedes copiar, modificar, distribuir, vender o sublicenciar el software o cualquier parte del mismo.',
      'No puedes realizar ingeniería inversa, descompilar o desensamblar el software.',
      'No puedes utilizar el software para crear productos o servicios competidores.',
    ],
  },
  {
    title: '6. Uso responsable de la información',
    paragraphs: [
      'La información disponible en Camella debe utilizarse únicamente para fines comerciales legítimos y respetando la normativa aplicable en tu jurisdicción, incluyendo la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP).',
    ],
    bullets: [
      'No compartirás tus credenciales ni automatizarás el acceso sin autorización explícita.',
      'No extraerás datos de manera masiva para revenderlos, publicarlos o utilizarlos fuera del contexto de tu negocio legítimo.',
      'No intentarás vulnerar la seguridad de la plataforma ni interferir con otros usuarios.',
      'No utilizarás la información para actividades ilegales, fraudulentas o que violen derechos de terceros.',
      'Reportarás inmediatamente cualquier incidente de seguridad o uso indebido que detectes a soporte@camella.app.',
    ],
  },
  {
    title: '7. Pagos y facturación',
    paragraphs: [
      'Los precios están expresados en Dólares de los Estados Unidos de América (USD).',
      'IVA: A los precios listados se les agregará el 15% del Impuesto al Valor Agregado (IVA) cuando aplique según la normativa del Servicio de Rentas Internas (SRI) de Ecuador, salvo excepciones legales debidamente justificadas.',
      'Facturación electrónica: La factura electrónica será enviada al correo registrado dentro de las 24 horas siguientes al pago, cumpliendo con la normativa del SRI. Las facturas son obligatorias y se emiten automáticamente.',
      'Retenciones: Si eres una empresa (B2B), podrías estar sujeto a retenciones de Impuesto a la Renta y IVA según tu calificación tributaria.',
    ],
    bullets: [
      'Cada plan de Camella (Free, Pro, Enterprise) define límites de búsquedas, tokens y funcionalidades.',
      'Las suscripciones se renuevan de forma automática hasta que sean canceladas por el usuario.',
      'Los cobros ya realizados no son reembolsables, salvo disposición legal en contrario o garantía de satisfacción explícitamente ofrecida.',
      'Nos reservamos el derecho de suspender temporalmente tu acceso si excedes los límites permitidos o afectas la estabilidad del servicio.',
    ],
  },
  {
    title: '8. Disponibilidad y nivel de servicio',
    paragraphs: [
      'Intentamos mantener una disponibilidad alta del servicio. Sin embargo, no garantizamos disponibilidad ininterrumpida y no somos responsables por cortes causados por fuerza mayor, fallas de proveedores de infraestructura (como Supabase, Google Cloud), mantenimiento programado o actualizaciones necesarias del sistema.',
    ],
  },
  {
    title: '9. Protección de datos personales',
    paragraphs: [
      'El responsable del tratamiento de datos personales es Camella. Para cualquier consulta relacionada con privacidad, puedes contactarnos en soporte@camella.app.',
      'Procesamos los datos personales estrictamente necesarios para autenticarte, proveer el servicio, realizar la facturación (obligaciones tributarias), monitorear el uso permitido y mejorar el servicio. Toda la información se resguarda bajo estándares de seguridad equivalentes a los de la infraestructura de Supabase y Google Cloud.',
      'El tratamiento se basa en la ejecución del contrato (estos Términos y Condiciones) y en el consentimiento explícito otorgado al registrarse, conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP).',
    ],
    bullets: [
      'Datos que recolectamos: Nombres, correos electrónicos, datos de facturación, logs de uso de la plataforma, direcciones IP y user agents para seguridad y cumplimiento legal.',
      'Transferencia de datos: Tus datos pueden ser alojados en servidores de proveedores de infraestructura (Supabase, Google Cloud) ubicados fuera de Ecuador, garantizando estándares de seguridad adecuados.',
      'Derechos ARCO: Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a soporte@camella.app. Tenemos un plazo legal de 15 días para responder a tu solicitud.',
      'Seguridad: Implementamos medidas técnicas (cifrado SSL, backups) y organizativas para proteger tu información, aunque ningún sistema es 100% invulnerable. En caso de brecha de seguridad que afecte tus derechos, notificaremos según lo dicta la ley.',
      'Te comprometes a manejar de forma confidencial la información que obtengas a través de Camella y a cumplir con la legislación de protección de datos aplicable.',
    ],
  },
  {
    title: '10. Limitación de responsabilidad',
    paragraphs: [
      'En la máxima medida permitida por la ley ecuatoriana, Camella no será responsable por daños indirectos, pérdida de lucro cesante, pérdida de datos, decisiones comerciales basadas en información de la plataforma o resultados generados por IA, o cualquier otro daño derivado del mal uso de la plataforma o de la naturaleza inherentemente inconsistente de las tecnologías de IA.',
      'El usuario reconoce que utiliza el servicio bajo su propio riesgo y que es responsable de validar toda información crítica antes de tomar decisiones comerciales, legales o financieras.',
    ],
  },
  {
    title: '11. Legislación y jurisdicción',
    paragraphs: [
      'Este acuerdo se rige por las leyes de la República del Ecuador. Cualquier controversia se resolverá primeramente mediante mediación y, en su defecto, ante los jueces competentes de Ecuador, sin perjuicio de las normas imperativas aplicables en tu lugar de residencia.',
    ],
  },
  {
    title: '12. Modificaciones y vigencia',
    paragraphs: [
      'Podemos actualizar estos Términos para reflejar cambios regulatorios, mejoras del producto o nuevas funcionalidades. Te notificaremos dentro de la plataforma cuando exista una nueva versión y deberás aceptarla para continuar usando el servicio.',
      'La versión vigente es la señalada en este documento. Si no aceptas los nuevos términos, deberás cesar el uso del servicio y podrás cancelar tu suscripción según los términos de cancelación aplicables.',
    ],
  },
]

