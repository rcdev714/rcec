"use client";

import { useState } from "react";
import { Home, Database, Bot, Package, Search, FileText, CreditCard, BarChart3, Settings, HelpCircle, Menu, X, MessageCircle, Zap, Target, Sparkles } from "lucide-react";
import PricingPlans from "@/components/pricing-plans";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: "overview", label: "Visión General", icon: Home },
    { id: "getting-started", label: "Primeros Pasos", icon: Home },
    { id: "company-database", label: "Base de Datos", icon: Database },
    { id: "ai-assistant", label: "Asistente IA", icon: Bot },
    { id: "services-management", label: "Servicios", icon: Package },
    { id: "advanced-search", label: "Búsqueda", icon: Search },
    { id: "data-export", label: "Exportación", icon: FileText },
    { id: "subscription-plans", label: "Suscripciones", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "api-reference", label: "API", icon: Settings },
    { id: "support", label: "Soporte", icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Documentación</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Documentación de Acquira
              </h1>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl">
                Plataforma integral para encontrar y analizar empresas ecuatorianas con inteligencia artificial.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">¿Qué es Acquira?</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Acquira es una plataforma B2B especializada en el mercado ecuatoriano que combina una base de datos
                  completa de empresas con un asistente de inteligencia artificial para potenciar estrategias comerciales
                  y de venta. Diseñada para vendedores, consultores y empresas que necesitan encontrar prospectos
                  ideales en el mercado ecuatoriano.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="text-3xl font-bold text-gray-600 mb-2">+300,000</div>
                  <div className="text-sm font-medium text-gray-600">Empresas Ecuatorianas</div>
                  <div className="text-xs text-gray-500 mt-1">Base de datos completa</div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="text-3xl font-bold text-gray-600 mb-2">1.5M</div>
                  <div className="text-sm font-medium text-gray-600">Registros Financieros</div>
                  <div className="text-xs text-gray-500 mt-1">Datos actualizados y verificados</div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="text-3xl font-bold text-gray-600 mb-2">200,000</div>
                  <div className="text-sm font-medium text-gray-600">Contactos LinkedIn</div>
                  <div className="text-xs text-gray-500 mt-1">Perfiles profesionales disponibles</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "getting-started":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Comenzar</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Primeros Pasos</h1>
              <p className="mt-4 text-xl text-gray-600">
                Descubre el poder de nuestro Asistente IA, el corazón de Acquira que transforma cómo encuentras empresas.
              </p>
            </div>

            <div className="space-y-8">
              {/* Featured AI Agent Section */}
              <div className="bg-white border-2 border-gray-300 rounded-xl p-8 relative">
                <div className="absolute -top-4 left-8 bg-white border border-gray-300 rounded-lg px-4 py-2">
                  <span className="text-sm font-semibold text-gray-900">Característica Principal</span>
                </div>

                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles size={32} className="text-gray-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Asistente IA con Google Gemini</h2>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                      Nuestro asistente de IA es el corazón de Acquira. Conecta con Google Gemini 2.5 Flash
                      para entender tus consultas en lenguaje natural y encontrar las empresas perfectas para tu negocio.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle size={20} className="text-gray-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Conversaciones Naturales</h4>
                      <p className="text-sm text-gray-600">Habla como lo harías con un colega humano</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Zap size={20} className="text-gray-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Respuestas Rápidas</h4>
                      <p className="text-sm text-gray-600">Resultados en menos de 3 segundos</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Target size={20} className="text-gray-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Resultados Precisos</h4>
                      <p className="text-sm text-gray-600">Entiende el contexto ecuatoriano</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Ejemplos de lo que puedes preguntar:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-700">&quot;Muéstrame empresas rentables en Guayaquil&quot;</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-700">&quot;Busca la empresa con RUC 1790012345001&quot;</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-700">&quot;Empresas con más de 100 empleados&quot;</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-700">&quot;Exporta 50 empresas en Pichincha&quot;</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">1</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Navega al Asistente IA</h2>
                  </div>
                  <p className="text-lg text-gray-600 ml-11">
                    Ve al menú lateral y haz clic en &quot;Chat&quot; para abrir el asistente de IA.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 ml-11">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Límites del Plan Gratuito:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">10</div>
                        <div className="text-sm text-gray-600">Mensajes IA/mes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">100</div>
                        <div className="text-sm text-gray-600">Búsquedas/mes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">∞</div>
                        <div className="text-sm text-gray-600">Lectura de datos</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">2</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Tu Primera Conversación</h2>
                  </div>
                  <p className="text-lg text-gray-600 ml-11">
                    Prueba el asistente preguntando por empresas en tu sector o ubicación.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 ml-11">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">¿Qué puedes hacer?</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Buscar por RUC:</strong> &quot;Busca la empresa con RUC 1790012345001&quot;</li>
                      <li>• <strong>Filtrar por tamaño:</strong> &quot;Compañías con más de 50 empleados&quot;</li>
                      <li>• <strong>Buscar por rendimiento:</strong> &quot;Empresas rentables en Guayaquil&quot;</li>
                      <li>• <strong>Exportar resultados:</strong> &quot;Exporta 25 empresas&quot;</li>
                      <li>• <strong>Análisis detallado:</strong> &quot;Muéstrame el perfil de [empresa]&quot;</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">3</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Explora Más Funciones</h2>
                  </div>
                  <p className="text-lg text-gray-600 ml-11">
                    Una vez familiarizado con el IA, explora el dashboard y otras secciones.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 ml-11">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Próximos pasos:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Dashboard Personal</h4>
                        <p className="text-sm text-gray-600">Revisa tu uso mensual y métricas de rendimiento</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Filtros Avanzados</h4>
                        <p className="text-sm text-gray-600">Usa filtros manuales para búsquedas más específicas</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Servicios</h4>
                        <p className="text-sm text-gray-600">Crea perfiles de tus productos para prospectos automáticos</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Analytics</h4>
                        <p className="text-sm text-gray-600">Analiza tendencias y mejora tu estrategia</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">¿Listo para Más Potencia?</h3>
                  <p className="text-gray-600 mb-6">
                    El Plan Gratuito es perfecto para empezar. Cuando necesites más capacidades, actualiza a Pro.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Plan Pro - $20/mes</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 100 mensajes IA/mes (vs 10)</li>
                        <li>• Búsquedas ilimitadas (vs 100)</li>
                        <li>• 50 exportaciones/mes</li>
                        <li>• Soporte prioritario</li>
                        <li>• Búsqueda en LinkedIn</li>
                      </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Plan Empresarial - $200/mes</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 500 mensajes IA/mes</li>
                        <li>• Exportaciones ilimitadas</li>
                        <li>• Integraciones personalizadas</li>
                        <li>• Soporte dedicado</li>
                        <li>• Análisis avanzado con IA</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "company-database":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Base de Datos</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Base de Datos Empresarial</h1>
              <p className="mt-4 text-xl text-gray-600">
                Información completa y actualizada de más de 300,000 empresas ecuatorianas.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Información Disponible</h2>
              <p className="text-lg text-gray-600 mb-8">
                Nuestra base de datos incluye información completa y verificada de empresas ecuatorianas,
                actualizada regularmente con fuentes oficiales.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Datos Básicos</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">RUC (Registro Único de Contribuyentes)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Nombre legal y comercial</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Ubicación completa (provincia, cantón, ciudad)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Actividad principal (CIIU)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Estado y tipo de empresa</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Datos Financieros</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Ingresos por ventas</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Activos totales y patrimonio</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Utilidades (antes y después de impuestos)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Número de empleados</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-white0 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Ratios financieros calculados</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 bg-gray-50 rounded-xl p-8 border border-gray-200">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-bold text-2xl">in</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">Contacto Directo con Decision Makers</h3>
                    <p className="text-lg text-gray-700">
                      <strong>La característica más poderosa:</strong> Conecta directamente con los ejecutivos que toman las decisiones en cada empresa.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto Incluida</h4>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <h5 className="font-medium text-gray-900">Director/Representante Legal</h5>
                            <p className="text-sm text-gray-600">Nombre completo del ejecutivo principal</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <h5 className="font-medium text-gray-900">Cargo Directivo</h5>
                            <p className="text-sm text-gray-600">Posición específica en la estructura empresarial</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <h5 className="font-medium text-gray-900">Teléfono Empresarial</h5>
                            <p className="text-sm text-gray-600">Número de contacto directo de la empresa</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Ventaja Competitiva</h4>
                      <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex items-start space-x-2">
                          <span className="text-gray-600 mt-1">✓</span>
                          <span><strong>Networking Profesional:</strong> Construye relaciones antes de contactar</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-gray-600 mt-1">✓</span>
                          <span><strong>Personalización:</strong> Adapta tu propuesta al perfil específico</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-gray-600 mt-1">✓</span>
                          <span><strong>Investigación:</strong> Conoce el background del ejecutivo</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-gray-600 mt-1">✓</span>
                          <span><strong>Conexiones Directas:</strong> Acceso a tomadores de decisiones</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">LinkedIn Integration Premium</h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">in</span>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900">Búsqueda Automática</h5>
                            <p className="text-sm text-gray-700">Un clic abre LinkedIn con el nombre del director</p>
                          </div>
                        </div>
                        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">Disponible en:</span>
                            <div className="flex space-x-2">
                              <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">Pro</span>
                              <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded-full">Enterprise</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Por Qué es un Cambio de Juego</h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <span className="text-gray-500 text-lg">•</span>
                          <div>
                            <h5 className="font-medium text-gray-900">Antes vs Después</h5>
                            <p className="text-sm text-gray-700">
                              <strong>Antes:</strong> Llamadas en frío, emails genéricos<br/>
                              <strong>Después:</strong> Conexiones personalizadas, networking profesional
                            </p>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
                          <p className="text-sm text-gray-700">
                            <strong>Resultado:</strong> Tasas de respuesta 5x más altas, relaciones más sólidas,
                            y oportunidades de negocio más calificadas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "ai-assistant":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Asistente IA</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Asistente de IA</h1>
              <p className="mt-4 text-xl text-gray-600">
                Conversa naturalmente con Google Gemini para encontrar empresas perfectas para tu negocio.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">Tecnología Avanzada</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Nuestro asistente utiliza LangGraph y Google Gemini 2.5 Flash para proporcionar respuestas
                  precisas y contextuales. Está específicamente entrenado para entender el mercado ecuatoriano
                  y las necesidades de ventas B2B.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">¿Cómo Funciona?</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Consulta en Lenguaje Natural</h4>
                      <p className="text-sm text-gray-600 mt-1">Escribe como hablarías: &quot;Empresas rentables en Guayaquil&quot;</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Análisis Inteligente</h4>
                      <p className="text-sm text-gray-600 mt-1">IA traduce tu consulta en filtros específicos de búsqueda</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Resultados con Contexto</h4>
                      <p className="text-sm text-gray-600 mt-1">Recibe empresas con tarjetas detalladas y explicaciones</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Ejemplos Prácticos</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Búsqueda por RUC</p>
                    <code className="text-sm text-gray-700 block bg-white p-2 rounded border">&quot;Busca la empresa con RUC 1790012345001&quot;</code>
                    <p className="text-xs text-gray-500 mt-2">Encuentra una empresa específica por su RUC</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Criterios Financieros</p>
                    <code className="text-sm text-gray-700 block bg-white p-2 rounded border">&quot;Empresas con más de $1M en ventas&quot;</code>
                    <p className="text-xs text-gray-500 mt-2">Filtra por métricas específicas</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Análisis Complejo</p>
                    <code className="text-sm text-gray-700 block bg-white p-2 rounded border">&quot;Empresas rentables fundadas después de 2015&quot;</code>
                    <p className="text-xs text-gray-500 mt-2">Combina múltiples criterios</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Exportación Directa</p>
                    <code className="text-sm text-gray-700 block bg-white p-2 rounded border">&quot;Exporta 50 empresas en Guayas&quot;</code>
                    <p className="text-xs text-gray-500 mt-2">Genera reportes Excel directamente</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Características Técnicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Comprensión Contextual</h4>
                  <p className="text-sm text-gray-600">Entiende el contexto ecuatoriano y términos locales</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Datos en Tiempo Real</h4>
                  <p className="text-sm text-gray-600">Accede a información actualizada constantemente</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Conversaciones Continuas</h4>
                  <p className="text-sm text-gray-600">Mantiene contexto en conversaciones largas</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Análisis Comparativo</h4>
                  <p className="text-sm text-gray-600">Presenta tablas comparativas automáticamente</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Visualización Clara</h4>
                  <p className="text-sm text-gray-600">Resultados organizados en tarjetas informativas</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Respuestas Rápidas</h4>
                  <p className="text-sm text-gray-600">Optimizado para respuestas en menos de 3 segundos</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-sm">•</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Consejos para Mejor Uso</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>• Sé específico: &quot;empresas de software en Guayaquil&quot; vs &quot;empresas tech&quot;</li>
                    <li>• Incluye métricas: &quot;con más de 100 empleados&quot; o &quot;ventas superiores a $500K&quot;</li>
                    <li>• Usa el contexto local: menciona provincias específicas del Ecuador</li>
                    <li>• Combina criterios: tamaño de empresa + sector + ubicación</li>
                    <li>• Pide exportaciones directamente en tu consulta</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case "services-management":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Servicios</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Gestión de Servicios</h1>
              <p className="mt-4 text-xl text-gray-600">
                Crea perfiles detallados de tus productos/servicios y encuentra prospectos ideales automáticamente.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">¿Por Qué Gestionar Servicios?</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Los servicios te permiten organizar tu oferta comercial y definir exactamente qué tipo de empresas
                    son tus clientes ideales. El sistema utiliza esta información para sugerirte prospectos relevantes.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">Tu Canvas de Servicios: Plataforma Completa Lista para Usar</h3>
                  <p className="text-lg text-gray-700 mb-6">
                    Acquira te proporciona un <strong>canvas completo y personalizable</strong> donde puedes configurar
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

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Proceso de Creación</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">Crear Servicio</h3>
                    <p className="text-gray-600 mt-1">Ve a &quot;Servicios&quot; → &quot;Añadir Servicio&quot; y completa la información básica</p>
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

            <div className="bg-white border border-gray-200 rounded-lg p-8">
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
        );

      case "advanced-search":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Búsqueda</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Búsqueda Avanzada y Filtros</h1>
              <p className="mt-4 text-xl text-gray-600">
                Encuentra empresas específicas con nuestros poderosos filtros de búsqueda.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Filtros Básicos</h2>
              <p className="text-gray-600 mb-8">
                Comienza con estos filtros esenciales para encontrar empresas por información básica:
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Información de Identificación</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Nombre de Empresa</h5>
                          <p className="text-sm text-gray-600">Busca por razón social o nombre comercial</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">RUC</h5>
                          <p className="text-sm text-gray-600">Número de Registro Único de Contribuyentes</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Ubicación Geográfica</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Provincia</h5>
                          <p className="text-sm text-gray-600">Todas las 24 provincias ecuatorianas disponibles</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Azuay, Bolívar, Cañar, Carchi, Chimborazo, Cotopaxi, El Oro, Esmeraldas, Galápagos, Guayas, Imbabura, Loja, Los Ríos, Manabí, Morona Santiago, Napo, Orellana, Pastaza, Pichincha, Santa Elena, Santo Domingo, Sucumbíos, Tungurahua, Zamora Chinchipe
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Información Temporal</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Año Fiscal</h5>
                          <p className="text-sm text-gray-600">Datos financieros de años específicos (2008-2024)</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Mínimo de Empleados</h5>
                          <p className="text-sm text-gray-600">Filtra por tamaño de empresa según número de empleados</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Límites por Plan</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Gratuito</span>
                        <span className="text-sm font-medium text-gray-900">100 búsquedas/mes</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Pro</span>
                        <span className="text-sm font-medium text-gray-900">Ilimitadas</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Empresarial</span>
                        <span className="text-sm font-medium text-gray-900">Ilimitadas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Filtros Financieros Avanzados</h2>
              <p className="text-gray-600 mb-8">
                Accede a métricas financieras detalladas para encontrar empresas con perfiles específicos:
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Rangos de Ingresos y Activos</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Ingresos por Ventas</h5>
                          <p className="text-sm text-gray-600">Mínimo y máximo en dólares</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Activos Totales</h5>
                          <p className="text-sm text-gray-600">Valor total de activos de la empresa</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Patrimonio</h5>
                          <p className="text-sm text-gray-600">Capital propio de la empresa</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Rentabilidad</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Utilidad Neta</h5>
                          <p className="text-sm text-gray-600">Ganancias después de impuestos e intereses</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Información Adicional</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h5 className="font-medium text-gray-900">Nombre Comercial</h5>
                          <p className="text-sm text-gray-600">Nombre con el que opera la empresa (diferente al legal)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Cómo Usar los Filtros</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">1.</span>
                        <span>Selecciona filtros básicos para una búsqueda amplia</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">2.</span>
                        <span>Activa &quot;Filtros financieros&quot; para criterios avanzados</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">3.</span>
                        <span>Haz clic en &quot;Aplicar filtros&quot; para ver resultados</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">4.</span>
                        <span>Usa &quot;Limpiar&quot; para resetear todos los filtros</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Integración con IA</h2>
              <p className="text-gray-600 mb-8">
                Los filtros de búsqueda se combinan perfectamente con nuestro Asistente IA para resultados aún más precisos:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Búsqueda Híbrida</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>• Aplica filtros manuales primero para reducir el alcance</p>
                    <p>• Luego usa el IA para refinar dentro de esos resultados</p>
                    <p>• Obtén respuestas más rápidas y precisas</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Exportación Inteligente</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>• Los filtros aplicados se mantienen en las exportaciones</p>
                    <p>• Exporta solo las empresas que cumplen tus criterios</p>
                    <p>• Archivos Excel incluyen todos los datos filtrados</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Ejemplo de Uso Avanzado</h4>
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Escenario: Empresas Manufactureras Rentables</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <h6 className="font-medium text-gray-900 mb-2">Filtros Aplicados:</h6>
                        <ul className="space-y-1">
                          <li>• Provincia: Pichincha, Guayas</li>
                          <li>• Ingresos mínimos: $500,000</li>
                          <li>• Utilidad neta mínima: $50,000</li>
                          <li>• Año fiscal: 2023</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-gray-900 mb-2">Resultado:</h6>
                        <p>Empresas manufactureras en Quito y Guayaquil con buen rendimiento financiero, listas para prospectar.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Soporte y Limitaciones</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Límites de Uso</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>• <strong>Gratuito:</strong> 100 búsquedas por mes</p>
                    <p>• <strong>Pro/Empresarial:</strong> Búsquedas ilimitadas</p>
                    <p>• Los límites se resetean mensualmente</p>
                    <p>• Se aplican por usuario, no por organización</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Recomendaciones</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>• Combina múltiples filtros para resultados más precisos</p>
                    <p>• Usa rangos financieros amplios inicialmente</p>
                    <p>• Considera la ubicación para oportunidades locales</p>
                    <p>• Revisa datos de múltiples años para tendencias</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "data-export":
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Exportación de Datos</h1>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Funcionalidades de Exportación</h2>
              <p className="text-gray-600 mb-6">
                Exporta resultados de búsquedas a Excel para análisis adicionales.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Formatos</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Excel (.xlsx)</li>
                    <li>• Datos completos de empresas</li>
                    <li>• Información financiera incluida</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Límites por Plan</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Gratuito</span>
                      <span className="text-sm font-medium text-red-600">No disponible</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-sm text-gray-900">Pro</span>
                      <span className="text-sm font-medium text-gray-600">50/mes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "subscription-plans":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Planes</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Planes de Suscripción</h1>
              <p className="mt-4 text-xl text-gray-600">
                Elige el plan perfecto para las necesidades de tu negocio.
              </p>
            </div>

            <PricingPlans />

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Facturación y Pagos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Métodos de Pago</h4>
                    <p className="text-sm text-gray-700">
                      Aceptamos tarjetas de crédito y débito Visa, Mastercard y American Express
                      a través de Stripe para pagos seguros.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Cambios de Plan</h4>
                    <p className="text-sm text-gray-700">
                      Cambia tu plan en cualquier momento. Los cambios se aplican inmediatamente
                      y se prorratean para el período actual.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Analytics</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Analytics y Uso</h1>
              <p className="mt-4 text-xl text-gray-600">
                Monitorea tu actividad y entiende cómo estás usando la plataforma.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tu Panel de Control</h2>
              <p className="text-lg text-gray-600 mb-8">
                Desde tu dashboard principal puedes ver métricas detalladas de tu uso mensual,
                incluyendo gráficos de tendencias y límites de tu plan actual.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-lg">🔍</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Búsquedas</h4>
                      <p className="text-xs text-gray-500">Manuales realizadas</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Número de búsquedas manuales usando filtros avanzados.
                    Incluye límite mensual según tu plan.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-lg">🤖</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Mensajes IA</h4>
                      <p className="text-xs text-gray-500">Conversaciones con Gemini</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Consultas realizadas al asistente de IA. Cada plan tiene
                    un límite mensual de mensajes.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-lg">•</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Exportaciones</h4>
                      <p className="text-xs text-gray-500">Archivos Excel generados</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Reportes Excel descargados con resultados de búsqueda.
                    Disponible solo en planes pagados.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Límites por Plan</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Plan</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-900">Búsquedas</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-900">Mensajes IA</th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-900">Exportaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-medium">Gratuito</td>
                      <td className="border border-gray-200 px-4 py-3 text-center">100/mes</td>
                      <td className="border border-gray-200 px-4 py-3 text-center">10/mes</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">No disponible</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Pro</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-900">Ilimitadas</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-900">100/mes</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-900">50/mes</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-medium">Empresarial</td>
                      <td className="border border-gray-200 px-4 py-3 text-center">Ilimitadas</td>
                      <td className="border border-gray-200 px-4 py-3 text-center">500/mes</td>
                      <td className="border border-gray-200 px-4 py-3 text-center">Ilimitadas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Gráficos y Tendencias</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Gráfico de Actividad</h3>
                  <p className="text-gray-600 mb-4">
                    Visualiza tus búsquedas diarias en un gráfico interactivo que puedes filtrar por períodos:
                    últimos 1, 7 o 30 días.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Botones de filtro:</span>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">1d</span>
                        <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">7d</span>
                        <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">30d</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">El gráfico muestra tendencias de uso para ayudarte a entender tus patrones</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Indicadores de Progreso</h3>
                  <p className="text-gray-600 mb-4">
                    Cada métrica incluye una barra de progreso visual que te muestra cuánto has usado
                    de tu límite mensual.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Búsquedas</span>
                          <span>45 / 100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gray-600 h-2 rounded-full" style={{width: '45%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Mensajes IA</span>
                          <span>7 / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gray-700 h-2 rounded-full" style={{width: '70%'}}></div>
                        </div>
                      </div>
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
                  <h3 className="text-lg font-semibold text-gray-900">Optimizando tu Uso</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>• Monitorea regularmente tus límites para evitar interrupciones</li>
                    <li>• Usa el asistente IA para búsquedas complejas y ahorrar tiempo</li>
                    <li>• Exporta datos estratégicos para análisis posteriores</li>
                    <li>• Considera actualizar tu plan si alcanzas límites frecuentemente</li>
                    <li>• Revisa tendencias mensuales para optimizar tu estrategia de búsqueda</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case "api-reference":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">API</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Referencia de API</h1>
              <p className="mt-4 text-xl text-gray-600">
                Endpoints disponibles para integración y desarrollo avanzado.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Autenticación</h2>
              <p className="text-lg text-gray-600 mb-6">
                Todas las APIs requieren autenticación mediante tokens de Supabase.
                Incluye el token en el header de Authorization.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Headers Requeridos</h4>
                <pre className="bg-white border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
Content-Type: application/json`}
                </pre>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Endpoints Principales</h2>
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">POST /api/chat</h4>
                      <p className="text-sm text-gray-600 mt-1">Asistente de IA</p>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                      Autenticado
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Envía mensajes al asistente de IA potenciado por Google Gemini.
                    Soporta consultas en lenguaje natural sobre empresas ecuatorianas.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Request Body</h5>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`{
  "message": "Muéstrame empresas de tecnología en Quito",
  "conversationId": "optional-conversation-id"
}`}
                      </pre>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`// Streaming response with company results
// Returns formatted text with company cards`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">GET /api/user-offerings</h4>
                      <p className="text-sm text-gray-600 mt-1">Gestión de Servicios</p>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                      Autenticado
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Obtiene la lista de servicios configurados por el usuario.
                    Incluye información completa sobre precios, targeting y enlaces.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`[
  {
    "id": "service-uuid",
    "offering_name": "Consultoría Empresarial",
    "description": "Servicios de consultoría...",
    "industry": "Consultoría",
    "price_plans": [...],
    "industry_targets": ["Tecnología", "Manufactura"],
    "website_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">GET /api/companies/export</h4>
                      <p className="text-sm text-gray-600 mt-1">Exportación de Datos</p>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                      Autenticado
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Exporta resultados de búsqueda a archivos Excel. Disponible solo en planes pagados.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Query Parameters</h5>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`?ruc=1234567890001
&nombre=empresa
&provincia=PICHINCHA
&anio=2023
&sessionId=optional-tracking-id`}
                      </pre>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <p className="text-sm text-gray-600">Archivo Excel (.xlsx) descargable</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">GET /api/usage/summary</h4>
                      <p className="text-sm text-gray-600 mt-1">Analytics y Uso</p>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                      Autenticado
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Obtiene métricas de uso mensual del usuario, incluyendo límites y consumo actual.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Response</h5>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`{
  "usage": {
    "searches": 45,
    "exports": 12,
    "prompts": 7
  },
  "limits": {
    "searches": 100,
    "exports": 50,
    "prompts": 10
  },
  "plan": "PRO"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Límites de API</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Limiting</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Chat API: 60 requests/minute</li>
                    <li>• Companies API: 120 requests/minute</li>
                    <li>• Usage API: 30 requests/minute</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Limits</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Gratuito: Funciones básicas</li>
                    <li>• Pro: Límite mensual por tipo</li>
                    <li>• Empresarial: Límites elevados</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-sm">🚧</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Desarrollo de Integraciones</h3>
                  <p className="text-gray-700 mb-3">
                    Para integraciones personalizadas o acceso completo a la API, contacta a nuestro equipo empresarial.
                  </p>
                  <p className="text-sm text-yellow-700">
                    Ofrecemos SDKs, webhooks y documentación técnica completa para empresas que requieren
                    integraciones avanzadas con sus sistemas existentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "support":
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Soporte</p>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Soporte y Ayuda</h1>
              <p className="mt-4 text-xl text-gray-600">
                Estamos aquí para ayudarte. Encuentra respuestas rápidas a tus preguntas.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Canales de Soporte por Plan</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-lg">📖</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Gratuito</h3>
                      <p className="text-sm text-gray-600">Centro de Ayuda</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Documentación completa</li>
                    <li>• Comunidad de usuarios</li>
                    <li>• Soporte por email</li>
                    <li>• Tiempo de respuesta: 24-48h</li>
                  </ul>
                </div>

                <div className="border-2 border-blue-500 rounded-lg p-6 bg-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-lg">•</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
                      <p className="text-sm text-gray-600">Soporte Prioritario</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Todo lo del plan Gratuito</li>
                    <li>• Chat en vivo prioritario</li>
                    <li>• Sesiones de capacitación</li>
                    <li>• Tiempo de respuesta: 4-8h</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-lg">👑</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Empresarial</h3>
                      <p className="text-sm text-gray-600">Soporte Dedicado</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Todo lo del plan Pro</li>
                    <li>• Account Manager dedicado</li>
                    <li>• Integraciones personalizadas</li>
                    <li>• Tiempo de respuesta: 1-2h</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Preguntas Frecuentes</h2>
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">¿Cómo funciona la búsqueda con IA?</h3>
                  <p className="text-gray-600 mb-3">
                    Nuestro asistente utiliza Google Gemini para interpretar consultas en lenguaje natural
                    y buscar empresas que coincidan con tus criterios específicos.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Ejemplo:</p>
                    <code className="text-sm text-gray-700 bg-white p-2 rounded border block">
                      &quot;Muéstrame empresas rentables en Guayaquil&quot;
                    </code>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">¿Los datos están actualizados?</h3>
                  <p className="text-gray-600">
                    Sí, mantenemos nuestra base de datos actualizada regularmente con información financiera
                    y empresarial verificada de fuentes oficiales ecuatorianas. Los datos incluyen información
                    hasta el año fiscal más reciente disponible.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">¿Puedo cancelar mi suscripción?</h3>
                  <p className="text-gray-600 mb-3">
                    Absolutamente. Puedes cancelar tu suscripción en cualquier momento desde la sección
                    de suscripción sin penalizaciones. Tu acceso continuará hasta el final del período pagado.
                  </p>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Tip:</strong> Si cancelas, puedes reactivar tu cuenta en cualquier momento
                      y recuperar todos tus datos y configuraciones.
                    </p>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">¿Ofrecen formación o capacitación?</h3>
                  <p className="text-gray-600 mb-3">
                    Sí, ofrecemos diferentes niveles de capacitación según tu plan:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 ml-4">
                    <li>• <strong>Gratuito:</strong> Webinars mensuales gratuitos</li>
                    <li>• <strong>Pro:</strong> Sesiones de capacitación personalizada</li>
                    <li>• <strong>Empresarial:</strong> Capacitación in-house para equipos</li>
                  </ul>
                </div>

                <div className="pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">¿Cómo exporto mis resultados de búsqueda?</h3>
                  <p className="text-gray-600 mb-3">
                    La exportación está disponible en planes Pro y Empresarial. Una vez que encuentres
                    los resultados que necesitas, haz clic en &quot;Exportar&quot; para descargar un archivo Excel
                    con toda la información de las empresas.
                  </p>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Nota:</strong> Los archivos Excel incluyen hasta 1000 empresas por exportación
                      y contienen toda la información financiera y de contacto disponible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-xl">💬</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">¿Necesitas Ayuda Personalizada?</h3>
                  <p className="text-gray-700 mb-4">
                    Nuestro equipo está listo para ayudarte con cualquier pregunta o problema específico.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-1">Email</h4>
                      <p className="text-sm text-gray-600">soporte@acquira.com</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-1">WhatsApp</h4>
                      <p className="text-sm text-gray-600">+593 99 999 9999</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-1">Horario</h4>
                      <p className="text-sm text-gray-600">L-V 9:00 AM - 6:00 PM ECT</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recursos Adicionales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">📚 Centro de Aprendizaje</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Guías paso a paso</li>
                    <li>• Videos tutoriales</li>
                    <li>• Casos de uso prácticos</li>
                    <li>• Mejores prácticas</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">🌐 Comunidad</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Foro de usuarios</li>
                    <li>• Webinars mensuales</li>
                    <li>• Casos de éxito</li>
                    <li>• Actualizaciones del producto</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Sección no encontrada</div>;
    }
  };

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false); // Close mobile sidebar when navigating
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile header */}
      <div className="lg:hidden border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">Documentación</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-white">
            <div className="flex flex-col overflow-y-auto pt-5 pb-4">
              <div className="flex flex-col px-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection === item.id
                          ? "bg-white text-gray-700 border-r-2 border-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 py-8">
              <h1 className="text-xl font-bold text-gray-900">Documentación</h1>
            </div>
            <div className="flex-grow flex flex-col">
              <nav className="flex-1 px-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`group w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection === item.id
                          ? "bg-white text-gray-700 border-r-2 border-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 lg:pl-80">
          <main className="flex-1 relative z-0 focus:outline-none">
            <div className="py-6">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="prose prose-gray max-w-none">
                  {renderContent()}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
