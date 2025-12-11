"use client";

import { useState, useEffect, useMemo } from "react";
import { Home, Menu, X, Rocket, Database, Brain, Package, Filter, FileText, CreditCard, LayoutDashboard, Settings } from "lucide-react";
import Link from 'next/link';

interface Section {
  id: string;
  name: string;
  icon: React.ElementType;
  subsections: { id: string; title: string }[];
  content: React.ReactNode;
}

export default function DocsPageClient() {
  const [activeSection, setActiveSection] = useState("overview");
  const [activeSubSection, setActiveSubSection] = useState("");
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sectionsData: Section[] = useMemo(() => [
    { 
      id: "overview", 
      name: "Visión General", 
      icon: Home,
      subsections: [
        { id: "overview-intro", title: "¿Qué es Camella?" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Documentación de Camella</h1>
          <p className="text-lg !mt-0 text-gray-500">
                  Plataforma integral para encontrar y analizar empresas ecuatorianas con inteligencia artificial.
                  Todo lo que necesitas saber para maximizar tu experiencia.
                </p>
          
          <h2 id="overview-intro" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">¿Qué es Camella?</h2>
          <p className="!mt-4">
                  Camella es una plataforma B2B especializada en el mercado ecuatoriano que combina una base de datos
                  completa de empresas con un Motor de Búsqueda Empresarial para potenciar estrategias comerciales
                  y de venta. Diseñada para vendedores, consultores y empresas que necesitan encontrar prospectos
                  ideales en el mercado ecuatoriano.
                </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Búsqueda Inteligente:</strong> Encuentra empresas perfectas con IA avanzada.</li>
            <li><strong>Datos Completos:</strong> Información financiera y de contacto verificada.</li>
            <li><strong>Resultados Rápidos:</strong> Respuestas en segundos, no en horas.</li>
          </ul>
        </div>
      )
    },
    { 
      id: "getting-started", 
      name: "Primeros Pasos", 
      icon: Rocket,
      subsections: [
        { id: "g-start-guide", title: "Guía Paso a Paso" },
        { id: "g-start-nav", title: "1. Navega al Motor de Búsqueda Empresarial" },
        { id: "g-start-convo", title: "2. Tu Primera Conversación" },
        { id: "g-start-explore", title: "3. Explora Más Funciones" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Primeros Pasos en Camella</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Descubre el poder de nuestro Motor de Búsqueda Empresarial, el corazón de Camella que transforma cómo encuentras empresas. Comienza tu viaje en menos de 5 minutos.
          </p>
          
          <h2 id="g-start-guide" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Tu Guía Paso a Paso</h2>

          <h3 id="g-start-nav" className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">1. Navega al Motor de Búsqueda Empresarial</h3>
          <p className="!mt-4">
            Ve al menú lateral y haz clic en &quot;Agente&quot; para abrir el Motor de Búsqueda Empresarial. El plan gratuito te ofrece límites generosos para empezar:
          </p>
            <ul className="!mt-6 !space-y-3">
              <li>10 Mensajes IA/mes</li>
              <li>100 Búsquedas/mes</li>
              <li>Lectura de datos ilimitada</li>
            </ul>

            <h3 id="g-start-convo" className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">2. Tu Primera Conversación</h3>
            <p className="!mt-4">
              Prueba el Motor de Búsqueda Empresarial preguntando por empresas en tu sector o ubicación. Aquí tienes algunos ejemplos:
            </p>
            <ul className="!mt-6 !space-y-3">
                <li>&quot;Empresas con mayores ingresos en Pichincha&quot;</li>
                <li>&quot;Redacta un correo para ofrecer mis servicios de marketing&quot;</li>
                <li>&quot;Encuentra empresas en Guayas con más de 50 empleados&quot;</li>
                        </ul>

            <h3 id="g-start-explore" className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">3. Explora Más Funciones</h3>
            <p className="!mt-4">
              Una vez familiarizado con el IA, explora el dashboard para visualizar datos y la sección de empresas para búsquedas manuales y filtrado avanzado.
            </p>
            
            <div className="not-prose mt-8">
              <div className="bg-gray-600 rounded-lg p-8 text-white text-center">
                <h3 className="text-2xl font-semibold">¿Listo para Más Potencia?</h3>
                <p className="mt-2 text-gray-200 max-w-2xl mx-auto">
                  El Plan Gratuito es perfecto para empezar. Cuando necesites más capacidades, considera actualizar a Pro para desbloquear todo el potencial.
                </p>
                <div className="mt-6">
                  <Link href="/pricing" className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg">
                        Ver Planes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ),
    },
    {
      id: "company-database",
      name: "Base de Datos",
      icon: Database,
      subsections: [
        { id: "db-info", title: "Información Disponible" },
        { id: "db-contact", title: "Contacto Directo" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Base de Datos Empresarial</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Información completa y actualizada de más de 300,000 empresas ecuatorianas.
            </p>

          <h2 id="db-info" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Información Disponible</h2>
          <p className="!mt-4">
              Nuestra base de datos incluye información completa y verificada de empresas ecuatorianas,
              actualizada regularmente con fuentes oficiales.
            </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Datos Básicos</h3>
              <ul className="!mt-6 !space-y-3">
                <li>RUC (Registro Único de Contribuyentes)</li>
                <li>Nombre legal y comercial</li>
                <li>Ubicación completa (provincia, cantón, ciudad)</li>
                <li>Actividad principal (CIIU)</li>
                <li>Estado y tipo de empresa</li>
                </ul>
              </div>

                        <div>
              <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Datos Financieros</h3>
              <ul className="!mt-6 !space-y-3">
                <li>Ingresos por ventas</li>
                <li>Activos totales y patrimonio</li>
                <li>Utilidades (antes y después de impuestos)</li>
                <li>Número de empleados</li>
                <li>Ratios financeiros calculados</li>
                    </ul>
                  </div>
                </div>

          <h2 id="db-contact" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Contacto Directo con Decision Makers</h2>
          <p className="!mt-4">
            <strong>La característica más poderosa:</strong> Conecta directamente con los ejecutivos que toman las decisiones en cada empresa. Proporcionamos perfiles de LinkedIn de directivos y gerentes, emails y teléfonos para que puedas contactarlos fácilmente.
          </p>
        </div>
      )
    },
    {
      id: "ai-assistant",
      name: "Asistente IA",
      icon: Brain,
      subsections: [
        { id: "ai-capabilities", title: "Capacidades Clave" },
        { id: "ai-examples", title: "Ejemplos de Uso" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Motor de Búsqueda Empresarial</h1>
          <p className="text-lg !mt-0 text-gray-500">
            El corazón de Camella: una interfaz conversacional para explorar datos complejos de forma sencilla.
          </p>
          
          <h2 id="ai-capabilities" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Capacidades Clave</h2>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Búsqueda Semántica:</strong> Entiende la intención de tus preguntas, no solo palabras clave.</li>
            <li><strong>Filtrado Avanzado:</strong> Combina múltiples criterios en una sola consulta en lenguaje natural.</li>
            <li><strong>Generación de Contenido:</strong> Redacta correos, crea resúmenes y más.</li>
          </ul>

          <h2 id="ai-examples" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Ejemplos de Uso</h2>
          <ul className="!mt-6 !space-y-3">
            <li>&quot;Encuentra empresas de software en Quito con más de 50 empleados.&quot;</li>
            <li>&quot;¿Cuáles son las 10 empresas con mayores ingresos en Guayas?&quot;</li>
            <li>&quot;Redacta un correo para presentar mis servicios de consultoría a [nombre de empresa].&quot;</li>
                  </ul>
        </div>
      )
    },
    {
      id: "services-management",
      name: "Gestión de Servicios",
      icon: Package,
      subsections: [
        { id: "services-why", title: "¿Por Qué Gestionar Servicios?"},
        { id: "services-canvas", title: "Canvas de Servicios" },
        { id: "services-creation", title: "Proceso de Creación" },
        { id: "services-fields", title: "Campos Disponibles" },
      ],
      content: (
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Servicios</p>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-2">Gestión de Servicios</h1>
            <p className="text-lg !mt-2 text-gray-500">
              Crea perfiles detallados de tus productos/servicios y encuentra prospectos ideales automáticamente.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="space-y-6">
              <div>
                <h2 id="services-why" className="!mt-0 !mb-4 text-xl font-semibold tracking-tight">¿Por Qué Gestionar Servicios?</h2>
                <p className="!mt-4 text-lg text-gray-600 mb-6">
                  Los servicios te permiten organizar tu oferta comercial y definir exactamente qué tipo de empresas
                  son tus clientes ideales. El sistema utiliza esta información para sugerirte prospectos relevantes.
                </p>
              </div>

              <div id="services-canvas" className="bg-gray-50 rounded-xl p-8 border border-gray-200 mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Tu Canvas de Servicios: Plataforma Completa Lista para Usar</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Camella te proporciona un <strong>canvas completo y personalizable</strong> donde puedes configurar
                  y vender cualquier tipo de servicio o producto que ofrezcas a empresas ecuatorianas.
                  Es como tener tu propia tienda online integrada con una base de datos de 300,000+ empresas.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-xl">S</span>
                      </div>
                      <h4 className="font-semibold text-gray-900">Tienda Personal</h4>
                    </div>
                    <p className="text-sm text-gray-600">Tu propia vitrina digital para mostrar servicios con diseño profesional</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-xl">P</span>
                      </div>
                      <h4 className="font-semibold text-gray-900">Pagos Integrados</h4>
                    </div>
                    <p className="text-sm text-gray-600">Sistema de pagos seguro con Stripe para procesar transacciones automáticamente</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-xl">T</span>
                      </div>
                      <h4 className="font-semibold text-gray-900">Targeting Automático</h4>
                    </div>
                    <p className="text-sm text-gray-600">La plataforma encuentra automáticamente empresas ideales para tus servicios</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Lo que Incluye tu Canvas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Página de Producto</h5>
                          <p className="text-sm text-gray-600">Presentación profesional con imágenes, videos y descripciones</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Sistema de Precios</h5>
                          <p className="text-sm text-gray-600">Múltiples planes, descuentos y opciones de pago flexibles</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Formulario de Contacto</h5>
                          <p className="text-sm text-gray-600">Captura leads automáticamente con formularios integrados</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Analytics Integrados</h5>
                          <p className="text-sm text-gray-600">Métricas de rendimiento y conversiones en tiempo real</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Gestión de Clientes</h5>
                          <p className="text-sm text-gray-600">CRM integrado para seguimiento de prospectos y clientes</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Automatización</h5>
                          <p className="text-sm text-gray-600">Emails automáticos, recordatorios y seguimiento personalizado</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Información Básica</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">Nombre del Servicio</h4>
                        <p className="text-sm text-gray-600">Identifica claramente tu oferta</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">Descripción Detallada</h4>
                        <p className="text-sm text-gray-600">Explica qué ofreces y sus beneficios</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">Industria Objetivo</h4>
                        <p className="text-sm text-gray-600">Sector específico al que te diriges</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Modelos de Precio</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">Pago Único</h4>
                        <p className="text-sm text-gray-600">Productos o servicios con precio fijo</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">Suscripción</h4>
                        <p className="text-sm text-gray-600">Servicios recurrentes con múltiples planes</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">Planes Múltiples</h4>
                        <p className="text-sm text-gray-600">Opciones Básico, Pro, Empresarial, etc.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="services-creation" className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Proceso de Creación</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">Crear Servicio</h3>
                  <p className="text-gray-600 mt-1">Ve a &quot;Servicios&quot; &rarr; &quot;Añadir Servicio&quot; y completa la información básica</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">Definir Precios</h3>
                  <p className="text-gray-600 mt-1">Configura tus planes de precios y modelo de pago (único o suscripción)</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">Añadir Enlaces</h3>
                  <p className="text-gray-600 mt-1">Incluye sitio web, redes sociales y documentación para completar el perfil</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">Definir Targeting</h3>
                  <p className="text-gray-600 mt-1">Especifica qué industrias y criterios hacen que una empresa sea un prospecto ideal</p>
                </div>
              </div>
            </div>
          </div>

          <div id="services-fields" className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Configuración Completa del Canvas</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Campos Disponibles para tu Servicio</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">📝 Información Principal</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>Nombre del Servicio:</strong> Identificación clara</li>
                        <li>• <strong>Descripción:</strong> Detalles completos del servicio</li>
                        <li>• <strong>Industria:</strong> Sector al que pertenece</li>
                        <li>• <strong>Tipo de Pago:</strong> Único o suscripción</li>
                      </ul>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">💰 Configuración de Precios</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>Pago Único:</strong> Precio fijo por servicio</li>
                        <li>• <strong>Suscripción:</strong> Múltiples planes (mensual, anual)</li>
                        <li>• <strong>Planes Múltiples:</strong> Básico, Pro, Empresarial</li>
                        <li>• <strong>Precios Dinámicos:</strong> Según características</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Targeting Inteligente</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>Industrias Objetivo:</strong> Sectores específicos</li>
                        <li>• <strong>RUC Específicos:</strong> Empresas concretas</li>
                        <li>• <strong>Criterios Automáticos:</strong> Tamaño, ingresos, etc.</li>
                      </ul>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Enlaces y Redes</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>Sitio Web:</strong> Página principal del servicio</li>
                        <li>• <strong>Redes Sociales:</strong> Facebook, LinkedIn, Instagram</li>
                        <li>• <strong>Documentación:</strong> PDFs, presentaciones, casos de éxito</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-3">Ejemplos Completos de Servicios que Puedes Crear</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Consultoría Empresarial</h5>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Targeting Automático</p>
                        <p className="text-xs text-gray-600">Empresas con más de 50 empleados, ingresos superiores a $500K</p>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Modelo de Precios</p>
                        <p className="text-xs text-gray-600">$500/mes por consultoría estratégica</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Materiales Incluidos</p>
                        <p className="text-xs text-gray-600">Sitio web, LinkedIn, portafolio PDF</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Software SaaS</h5>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Targeting por Industria</p>
                        <p className="text-xs text-gray-600">Manufactura, comercio, servicios</p>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Planes Escalables</p>
                        <p className="text-xs text-gray-600">Básico $99/mes, Pro $299/mes, Enterprise $599/mes</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Recursos Digitales</p>
                        <p className="text-xs text-gray-600">Demo interactivo, documentación API, tutoriales</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Capacitación y Cursos</h5>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Targeting por Crecimiento</p>
                        <p className="text-xs text-gray-600">Startups fundadas post-2015, empresas en expansión</p>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Pago Único</p>
                        <p className="text-xs text-gray-600">$1,500 por curso completo de liderazgo empresarial</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Contenido Multimedia</p>
                        <p className="text-xs text-gray-600">Videos, PDFs, quizzes, certificados digitales</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Productos y Servicios Físicos</h5>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Targeting por Sector</p>
                        <p className="text-xs text-gray-600">Comercios, restaurantes, servicios profesionales</p>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Precios Variables</p>
                        <p className="text-xs text-gray-600">Desde $50 hasta $5,000 según producto/servicio</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Catálogos Digitales</p>
                        <p className="text-xs text-gray-600">Fotos, especificaciones, casos de uso, testimonios</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Servicios Técnicos</h5>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Targeting Técnico</p>
                        <p className="text-xs text-gray-600">Empresas con sistemas legacy, startups tech</p>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Proyecto + Soporte</p>
                        <p className="text-xs text-gray-600">$2,000 implementación + $300/mes soporte</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Documentación Técnica</p>
                        <p className="text-xs text-gray-600">Manuales, diagramas, guías de mantenimiento</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Consultoría de Datos</h5>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Targeting por Datos</p>
                        <p className="text-xs text-gray-600">Empresas con más de $1M en ingresos, múltiples sucursales</p>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Suscripción Analytics</p>
                        <p className="text-xs text-gray-600">$800/mes por dashboards y reportes personalizados</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-900">Recursos Analíticos</p>
                        <p className="text-xs text-gray-600">Datasets, modelos, presentaciones ejecutivas</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Gestión Avanzada</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Editar y Actualizar Servicios</h3>
                <p className="text-gray-600 mb-4">
                  Una vez creado tu servicio, puedes editarlo completamente en cualquier momento:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Modificar Precios</h4>
                      <p className="text-sm text-gray-600">Actualiza planes y precios sin perder configuraciones</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Cambiar Targeting</h4>
                      <p className="text-sm text-gray-600">Ajusta criterios de empresas objetivo</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Actualizar Contenido</h4>
                      <p className="text-sm text-gray-600">Modifica descripciones, enlaces y documentación</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-white0 rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Duplicar Servicios</h4>
                      <p className="text-sm text-gray-600">Crea variaciones basadas en servicios existentes</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics de Servicios</h3>
                <p className="text-gray-600 mb-4">
                  Monitorea el rendimiento de tus servicios con métricas detalladas:
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">Vistas</div>
                      <div className="text-gray-600">Cuántas empresas han visto tu servicio</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">Matches</div>
                      <div className="text-gray-600">Empresas que cumplen tus criterios</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">Engagement</div>
                      <div className="text-gray-600">Interacciones con tu contenido</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Ejemplos de Servicios</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Consultoría Empresarial</h4>
                  <p className="text-sm text-gray-600">Para empresas con más de 50 empleados en cualquier sector</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Software de Facturación</h4>
                  <p className="text-sm text-gray-600">Para comercios y empresas de servicios con ingresos mayor a $100K</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Capacitación Online</h4>
                  <p className="text-sm text-gray-600">Para empresas tecnológicas fundadas después de 2015</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Beneficios de Gestionar Servicios</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">Prospectos Calificados</h4>
                    <p className="text-sm text-gray-600 mt-1">Encuentra empresas que realmente necesitan tus servicios</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">Mejor Organización</h4>
                    <p className="text-sm text-gray-600 mt-1">Mantén tu oferta comercial estructurada y clara</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">Análisis de Mercado</h4>
                    <p className="text-sm text-gray-600 mt-1">Identifica oportunidades en sectores específicos</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">Seguimiento de Ventas</h4>
                    <p className="text-sm text-gray-600 mt-1">Monitorea el progreso de tus prospectos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">•</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Consejos para Servicios Efectivos</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  <li>• Sé específico en tu descripción para atraer al público correcto</li>
                  <li>• Define claramente tus precios y evita confusiones</li>
                  <li>• Incluye enlaces a casos de éxito o testimonios</li>
                  <li>• Actualiza regularmente tus servicios según el feedback</li>
                  <li>• Usa criterios de targeting precisos para mejores resultados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "filters",
      name: "Búsqueda y Filtros",
      icon: Filter,
      subsections: [
        { id: "filters-available", title: "Filtros Disponibles" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Búsqueda y Filtros Avanzados</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Control granular para tus búsquedas. Encuentra exactamente lo que necesitas con nuestro sistema de filtros.
          </p>

          <h2 id="filters-available" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Filtros Disponibles</h2>
          <p className="!mt-4">Combina decenas de filtros para segmentar el mercado ecuatoriano con precisión:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Filtros Principales</h3>
                <ul className="!mt-6 !space-y-3">
                  <li><strong>RUC:</strong> Busca por el Registro Único de Contribuyentes.</li>
                  <li><strong>Nombre Legal o Comercial:</strong> Encuentra empresas por su nombre.</li>
                  <li><strong>Ubicación:</strong> Filtra por Provincia.</li>
                  <li><strong>Año de Fundación:</strong> Segmenta por la antiguedad de la empresa.</li>
                  <li><strong>Palabras Clave:</strong> Busca en el nombre o actividad comercial.</li>
                </ul>
              </div>
              <div>
                <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Filtros Financieros</h3>
                <ul className="!mt-6 !space-y-3">
                  <li><strong>Ingresos por Ventas:</strong> Define un rango de ingresos.</li>
                  <li><strong>Número de Empleados:</strong> Filtra por tamaño de la empresa.</li>
                  <li><strong>Activos:</strong> Establece un rango para los activos totales.</li>
                  <li><strong>Patrimonio:</strong> Filtra por el patrimonio de la empresa.</li>
                  <li><strong>Utilidad (antes de imp. y neta):</strong> Busca por rangos de utilidad.</li>
                </ul>
              </div>
            </div>
            <p className="!mt-6">
              Además, puedes ordenar los resultados por criterios como completitud de datos, ingresos, número de empleados y más, en orden ascendente o descendente. También puedes requerir que las empresas tengan datos de ingresos o empleados para refinar aún más tu búsqueda.
            </p>
          </div>
      )
    },
    {
      id: "export",
      name: "Exportación de Datos",
      icon: FileText,
      subsections: [],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Exportación de Datos</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Lleva los datos contigo. Exporta tus listas de empresas a formato Excel para un análisis más profundo.
          </p>
          <p className="!mt-6">
            Después de cualquier búsqueda, haz clic en el botón &quot;Exportar&quot; para descargar los resultados. El número de exportaciones y la cantidad de empresas por exportación dependen de tu plan de suscripción.
          </p>
        </div>
      )
    },
    {
      id: "plans",
      name: "Planes y Suscripción",
      icon: CreditCard,
      subsections: [],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Planes y Suscripción</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Elige el plan que mejor se adapte a tus necesidades.
          </p>
          <p className="!mt-6">
            Ofrecemos desde un plan gratuito para que puedas probar la plataforma hasta planes empresariales con acceso ilimitado y características avanzadas. Puedes comparar todos los planes y gestionar tu suscripción en la sección de <Link href="/pricing">Precios</Link>.
          </p>
        </div>
      )
    },
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutDashboard,
      subsections: [
        { id: "dash-plan", title: "Tu Plan" },
        { id: "dash-analytics", title: "Análisis de Uso" },
        { id: "dash-subscription", title: "Suscripción" },
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Dashboard</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Tu centro de control para monitorear el uso de la plataforma, gestionar tu suscripción y acceder rápidamente a las herramientas principales.
          </p>
          
          <h2 id="dash-plan" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Tu Plan Actual</h2>
          <p className="!mt-4">
            Visualiza rápidamente los límites de tu plan actual, incluyendo el número de conversaciones con IA, búsquedas de empresas y exportaciones de datos disponibles por mes. Un seguimiento claro de tu consumo te ayuda a maximizar los recursos de tu suscripción.
          </p>

          <h2 id="dash-analytics" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Análisis de Uso</h2>
          <p className="!mt-4">
            Obtén estadísticas sobre tu actividad en la plataforma. Esta sección te permite entender cómo estás utilizando Camella, qué búsquedas has realizado y cuál es tu historial de interacciones. Es una herramienta clave para optimizar tu estrategia de prospección.
          </p>

          <h2 id="dash-subscription" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Estado de tu Suscripción</h2>
          <p className="!mt-4">
            Gestiona todos los aspectos de tu suscripción a Camella.
          </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Portal de Facturación:</strong> Accede al portal seguro de Stripe para actualizar tu método de pago, ver facturas y gestionar tu suscripción. (Disponible solo para planes de pago).</li>
            <li><strong>Cambiar Plan:</strong> Explora otros planes y actualiza tu suscripción para acceder a más funcionalidades.</li>
          </ul>
        </div>
      )
    },
    {
      id: "settings",
      name: "Configuración",
      icon: Settings,
      subsections: [
        { id: "settings-personal", title: "Información Personal" },
        { id: "settings-company", title: "Información de Empresa" },
        { id: "settings-billing", title: "Gestión de Pagos" },
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Configuración de la Cuenta</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Personaliza tu perfil, gestiona la información de tu empresa y administra tu suscripción y facturación.
          </p>
          
          <h2 id="settings-personal" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Información Personal</h2>
          <p className="!mt-4">
            Actualiza tus datos personales para mantener tu perfil al día. Puedes editar los siguientes campos:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Nombre y Apellido</li>
            <li>Teléfono de contacto</li>
            <li>Cargo o posición en tu empresa</li>
          </ul>
          <p className="!mt-6">Tu correo electrónico se utiliza como identificador único y no puede ser modificado desde esta pantalla.</p>

          <h2 id="settings-company" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Información de Empresa</h2>
          <p className="!mt-4">
            Proporciona detalles sobre la empresa que representas. Esta información nos ayuda a personalizar tu experiencia.
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Nombre de la Empresa</li>
            <li>RUC de la Empresa (13 dígitos)</li>
          </ul>

          <h2 id="settings-billing" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Gestión de Pagos y Suscripción</h2>
          <p className="!mt-4">
            Controla todos los aspectos de tu suscripción a Camella.
          </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Portal de Facturación:</strong> Accede al portal seguro de Stripe para actualizar tu método de pago, ver facturas y gestionar tu suscripción. (Disponible solo para planes de pago).</li>
            <li><strong>Cambiar Plan:</strong> Explora otros planes y actualiza tu suscripción para acceder a más funcionalidades.</li>
          </ul>
          <p className="!mt-6 text-sm text-gray-600">
            Integración con Stripe: utilizamos la versión de API configurada en <code>STRIPE_API_VERSION</code> (o la versión por defecto de tu cuenta si no está definida). Consulta la documentación oficial para más detalles:
            {' '}<a className="text-blue-600 hover:underline" href="https://docs.stripe.com/api/checkout/sessions" target="_blank" rel="noreferrer">Checkout Sessions</a>,{' '}
            <a className="text-blue-600 hover:underline" href="https://docs.stripe.com/api/customer_portal/sessions" target="_blank" rel="noreferrer">Billing Portal Sessions</a>,{' '}
            <a className="text-blue-600 hover:underline" href="https://docs.stripe.com/webhooks" target="_blank" rel="noreferrer">Webhooks</a>.
          </p>
        </div>
      )
    }
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      let currentSection = "";
      let currentSubSection = "";

      // Determine active section
      for (const section of sectionsData) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= window.scrollY + 100) {
          currentSection = section.id;
        }
      }
      setActiveSection(currentSection || "overview");

      // Determine active sub-section within the current active section
      const activeSectionData = sectionsData.find(s => s.id === currentSection);
      if (activeSectionData) {
        for (const sub of activeSectionData.subsections) {
          const subElement = document.getElementById(sub.id);
          if (subElement && subElement.offsetTop <= window.scrollY + 120) {
            currentSubSection = sub.id;
          }
        }
      }
      setActiveSubSection(currentSubSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [sectionsData]);


  const handleNavClick = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const currentSectionData = sectionsData.find(s => s.id === activeSection);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 bg-white/80 backdrop-blur-sm border-b border-gray-200 lg:hidden">
        <div className="flex items-center">
          <Link href="/docs" className="flex items-center space-x-2">
            <span className="font-semibold text-lg text-gray-800">Docs</span>
          </Link>
          </div>
          <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-white shadow-xl h-full">
            <div className="flex flex-col overflow-y-auto pt-16">
              <div className="flex items-center justify-between px-4 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Documentación</h2>
              </div>
              <div className="flex flex-col px-4 py-4 space-y-1">
                {sectionsData.map(({ id, name, icon: Icon }) => (
                    <button
                    key={id}
                    onClick={() => handleNavClick(id)}
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                      activeSection === id
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${activeSection === id ? 'text-gray-700' : 'text-gray-500'}`} />
                    {name}
                    </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0 fixed top-0 h-screen w-72">
        <div className="flex flex-col w-72 border-r border-gray-200 bg-white">
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b">
            <Link href="/docs" className="flex items-center space-x-2">
              <span className="font-semibold text-lg text-gray-800">Docs</span>
            </Link>
                </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-4 py-6 space-y-1">
              {sectionsData.map(({ id, name, icon: Icon }) => (
                    <button
                  key={id}
                  onClick={() => handleNavClick(id)}
                  className={`group w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    activeSection === id
                      ? "bg-gray-100 font-semibold text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === id ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  {name}
                    </button>
              ))}
              </nav>
            </div>
          </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 w-full pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 xl:pl-0 xl:pr-16">
            {sectionsData.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24 pt-8">
                    {section.content}
                </section>
            ))}
                </div>
      </main>

       {/* Right Sidebar */}
      <aside className="hidden xl:block fixed top-16 right-0 h-[calc(100vh-4rem)] w-64">
        <div className="h-full pl-8 pr-6 py-12 border-l border-gray-200">
            {currentSectionData && currentSectionData.subsections.length > 0 && (
                <div className="space-y-4">
                    <p className="font-medium text-sm text-gray-800">En esta página</p>
                    <ul className="space-y-2 border-l-2 border-gray-100">
                        {currentSectionData.subsections.map((sub: { id: string; title: string }) => (
                            <li key={sub.id}>
                                <a 
                                    href={`#${sub.id}`} 
                  onClick={(e) => {
                    e.preventDefault();
                                        document.getElementById(sub.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className={`-ml-0.5 block pl-4 py-1 border-l-2 text-sm transition-colors ${
                                        activeSubSection === sub.id
                                            ? 'font-semibold text-blue-600 border-blue-600'
                                            : 'text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-300'
                                    }`}
                                >
                                    {sub.title}
                                </a>
                            </li>
                        ))}
                    </ul>
              </div>
            )}
            </div>
      </aside>
    </div>
  );
}
