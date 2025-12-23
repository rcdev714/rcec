"use client";

import { useState, useEffect, useMemo } from "react";
import { Home, Menu, X, Rocket, Database, Brain, Package, Filter, FileText, CreditCard, Settings } from "lucide-react";
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
            Plataforma para buscar y analizar empresas ecuatorianas con inteligencia artificial.
                </p>
          
          <h2 id="overview-intro" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">¿Qué es Camella?</h2>
          <p className="!mt-4">
            Camella es un motor de búsqueda empresarial que combina una base de datos de más de 300,000 empresas ecuatorianas 
            con un asistente de IA conversacional. Diseñado para vendedores, consultores y empresas que necesitan encontrar 
            prospectos y analizar el mercado ecuatoriano.
                </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Motor de Búsqueda IA:</strong> Conversa con un asistente que busca empresas, analiza datos financieros y genera emails personalizados.</li>
            <li><strong>Base de Datos:</strong> Acceso a información financiera, ubicación, tamaño y más de empresas ecuatorianas.</li>
            <li><strong>Catálogo de Servicios:</strong> Crea y comparte tus servicios para que la IA los use como contexto en sus respuestas.</li>
          </ul>
        </div>
      )
    },
    { 
      id: "getting-started", 
      name: "Primeros Pasos", 
      icon: Rocket,
      subsections: [
        { id: "g-start-chat", title: "1. Usa el Motor de Búsqueda" },
        { id: "g-start-examples", title: "2. Ejemplos de Consultas" },
        { id: "g-start-companies", title: "3. Explora la Base de Datos" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Primeros Pasos</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Comienza a usar Camella en menos de 5 minutos.
          </p>
          
          <h2 id="g-start-chat" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">1. Usa el Motor de Búsqueda</h2>
          <p className="!mt-4">
            Ve a <strong>Agente</strong> en el menú lateral para abrir el Motor de Búsqueda Empresarial. 
            Puedes hacer preguntas en lenguaje natural sobre empresas ecuatorianas.
          </p>

          <h2 id="g-start-examples" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">2. Ejemplos de Consultas</h2>
            <ul className="!mt-6 !space-y-3">
            <li>&quot;Encuentra empresas de tecnología en Quito con más de 50 empleados&quot;</li>
            <li>&quot;Muéstrame las empresas con mayores ingresos en Guayas&quot;</li>
            <li>&quot;Analiza los estados financieros de Corporación Favorita&quot;</li>
            <li>&quot;Redacta un email para ofrecer mis servicios de consultoría a empresas manufactureras&quot;</li>
            <li>&quot;Encuentra contactos de directivos en empresas de retail&quot;</li>
            </ul>

          <h2 id="g-start-companies" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">3. Explora la Base de Datos</h2>
            <p className="!mt-4">
            También puedes buscar empresas manualmente en <strong>Empresas</strong> usando filtros avanzados por ubicación, 
            tamaño, ingresos y más. Cada empresa tiene un perfil completo con historial financiero.
          </p>
        </div>
      )
    },
    {
      id: "ai-assistant",
      name: "Motor de Búsqueda IA",
      icon: Brain,
      subsections: [
        { id: "ai-capabilities", title: "Capacidades" },
        { id: "ai-examples", title: "Ejemplos de Uso" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Motor de Búsqueda Empresarial</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Un asistente conversacional que busca empresas, analiza datos y genera contenido comercial.
          </p>
          
          <h2 id="ai-capabilities" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Capacidades</h2>
            <ul className="!mt-6 !space-y-3">
            <li><strong>Búsqueda de Empresas:</strong> Encuentra empresas por ubicación, sector, tamaño, ingresos y más.</li>
            <li><strong>Análisis Financiero:</strong> Obtén estados financieros completos, ratios y historial multi-año.</li>
            <li><strong>Búsqueda de Contactos:</strong> Encuentra directivos y representantes legales de empresas.</li>
            <li><strong>Generación de Emails:</strong> Redacta emails comerciales personalizados usando tus servicios como contexto.</li>
            <li><strong>Búsqueda Web:</strong> Busca noticias recientes e información adicional sobre empresas.</li>
                        </ul>

          <h2 id="ai-examples" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Ejemplos de Uso</h2>
          <div className="!mt-6 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-2">Búsqueda Simple</p>
              <p className="text-sm text-gray-600">&quot;Empresas de manufactura en Pichincha&quot;</p>
                </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-2">Análisis Financiero</p>
              <p className="text-sm text-gray-600">&quot;Analiza la salud financiera de Corporación Favorita&quot;</p>
              </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-2">Generación de Email</p>
              <p className="text-sm text-gray-600">&quot;Redacta un email ofreciendo mi servicio de consultoría a empresas de retail en Quito&quot;</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "company-database",
      name: "Base de Datos",
      icon: Database,
      subsections: [
        { id: "db-info", title: "Información Disponible" },
        { id: "db-filters", title: "Filtros y Búsqueda" },
        { id: "db-profiles", title: "Perfiles de Empresa" }
      ],
      content: (
        <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Base de Datos Empresarial</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Más de 300,000 empresas ecuatorianas con información financiera y empresarial completa.
            </p>

          <h2 id="db-info" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Información Disponible</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Datos Básicos</h3>
              <ul className="!mt-6 !space-y-3">
                <li>RUC (Registro Único de Contribuyentes)</li>
                <li>Nombre legal y comercial</li>
                <li>Ubicación (provincia, cantón, ciudad)</li>
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
                <li>Ratios financieros (ROE, ROA, liquidez)</li>
                    </ul>
                  </div>
                </div>

          <h2 id="db-filters" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Filtros y Búsqueda</h2>
          <p className="!mt-4">
            En la sección <strong>Empresas</strong> puedes filtrar por:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Ubicación:</strong> Provincia</li>
            <li><strong>Tamaño:</strong> Rango de empleados</li>
            <li><strong>Financiero:</strong> Ingresos, activos, patrimonio, utilidades</li>
            <li><strong>Búsqueda:</strong> RUC, nombre legal o comercial</li>
            <li><strong>Ordenamiento:</strong> Por ingresos, empleados, completitud de datos</li>
          </ul>

          <h2 id="db-profiles" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Perfiles de Empresa</h2>
          <p className="!mt-4">
            Cada empresa tiene un perfil completo que incluye:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Información general y ubicación</li>
            <li>Historial financiero multi-año (2020-2024)</li>
            <li>Gráficos de evolución de ingresos, activos y empleados</li>
            <li>Ratios financieros calculados</li>
                  </ul>
        </div>
      )
    },
    {
      id: "services-management",
      name: "Catálogo de Servicios",
      icon: Package,
      subsections: [
        { id: "services-why", title: "¿Para qué sirve?"},
        { id: "services-creation", title: "Crear un Servicio" },
        { id: "services-sharing", title: "Compartir Servicios" },
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Catálogo de Servicios</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Crea y gestiona tus servicios para que la IA los use como contexto en sus respuestas.
          </p>

          <h2 id="services-why" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">¿Para qué sirve?</h2>
          <p className="!mt-4">
            Cuando creas servicios en tu catálogo, el Motor de Búsqueda IA los usa automáticamente como contexto. 
            Esto permite que la IA:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Redacte emails personalizados mencionando tus servicios específicos</li>
            <li>Sugiera empresas relevantes según las industrias objetivo de tus servicios</li>
            <li>Genere propuestas comerciales contextualizadas</li>
                      </ul>

          <h2 id="services-creation" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Crear un Servicio</h2>
          <p className="!mt-4">
            Ve a <strong>Servicios</strong> → <strong>Crear producto</strong> y completa:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Nombre y descripción:</strong> Qué ofreces</li>
            <li><strong>Precios:</strong> Pago único o planes de suscripción</li>
            <li><strong>Industrias objetivo:</strong> Sectores a los que te diriges</li>
            <li><strong>Enlaces:</strong> Sitio web, redes sociales, documentación</li>
            <li><strong>Contacto público:</strong> Información para compartir (opcional)</li>
                      </ul>

          <h2 id="services-sharing" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Compartir Servicios</h2>
          <p className="!mt-4">
            Puedes hacer tus servicios públicos para compartirlos con empresas:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Activa el enlace público desde la página de edición</li>
            <li>Se genera una URL única que puedes compartir</li>
            <li>Incluye información de contacto pública (empresa, nombre, email, teléfono)</li>
            <li>Puedes desactivar el enlace en cualquier momento</li>
                </ul>
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
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Búsqueda y Filtros</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Filtra empresas por múltiples criterios para encontrar exactamente lo que necesitas.
          </p>

          <h2 id="filters-available" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Filtros Disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
              <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Básicos</h3>
                <ul className="!mt-6 !space-y-3">
                <li><strong>RUC:</strong> Búsqueda exacta por RUC</li>
                <li><strong>Nombre:</strong> Nombre legal o comercial</li>
                <li><strong>Provincia:</strong> Ubicación geográfica</li>
                <li><strong>Año:</strong> Año fiscal de los datos</li>
                </ul>
              </div>
              <div>
              <h3 className="!mt-8 !mb-3 text-lg font-semibold tracking-tight">Financieros</h3>
                <ul className="!mt-6 !space-y-3">
                <li><strong>Empleados:</strong> Rango mínimo y máximo</li>
                <li><strong>Ingresos:</strong> Rango de ingresos por ventas</li>
                <li><strong>Activos:</strong> Rango de activos totales</li>
                <li><strong>Patrimonio:</strong> Rango de patrimonio</li>
                <li><strong>Utilidades:</strong> Antes y después de impuestos</li>
                </ul>
              </div>
            </div>
            <p className="!mt-6">
            También puedes ordenar resultados por ingresos, empleados o completitud de datos, y requerir que las empresas 
            tengan datos de ingresos o empleados para refinar tu búsqueda.
            </p>
          </div>
      )
    },
    {
      id: "export",
      name: "Exportación",
      icon: FileText,
      subsections: [],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Exportación de Datos</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Exporta tus búsquedas a Excel para análisis externo.
          </p>
          <p className="!mt-6">
            Después de buscar empresas en la sección <strong>Empresas</strong> o usando el Motor de Búsqueda IA, 
            puedes exportar los resultados a un archivo Excel. Los límites de exportación dependen de tu plan de suscripción.
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
            Ofrecemos desde un plan gratuito para probar la plataforma hasta planes empresariales con acceso ilimitado. 
            Puedes comparar todos los planes y gestionar tu suscripción en la sección de <Link href="/pricing" className="text-blue-600 hover:underline">Precios</Link>.
          </p>
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
        { id: "settings-billing", title: "Suscripción" },
      ],
      content: (
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 !mb-3">Configuración</h1>
          <p className="text-lg !mt-0 text-gray-500">
            Gestiona tu perfil, información de empresa y suscripción.
          </p>
          
          <h2 id="settings-personal" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Información Personal</h2>
          <p className="!mt-4">
            Actualiza tus datos personales:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Nombre y apellido</li>
            <li>Teléfono de contacto</li>
            <li>Cargo o posición en tu empresa</li>
          </ul>
          <p className="!mt-6">Tu correo electrónico se utiliza como identificador único y no puede ser modificado desde esta pantalla.</p>

          <h2 id="settings-company" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Información de Empresa</h2>
          <p className="!mt-4">
            Proporciona detalles sobre la empresa que representas:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li>Nombre de la empresa</li>
            <li>RUC de la empresa (13 dígitos)</li>
          </ul>

          <h2 id="settings-billing" className="!mt-12 !mb-4 text-xl font-semibold tracking-tight">Suscripción</h2>
          <p className="!mt-4">
            Gestiona tu suscripción a Camella:
          </p>
          <ul className="!mt-6 !space-y-3">
            <li><strong>Estado del Plan:</strong> Visualiza tu plan actual y límites de uso</li>
            <li><strong>Portal de Facturación:</strong> Accede al portal seguro de Stripe para actualizar tu método de pago y ver facturas (disponible solo para planes de pago)</li>
            <li><strong>Cambiar Plan:</strong> Explora otros planes y actualiza tu suscripción desde <Link href="/pricing" className="text-blue-600 hover:underline">Precios</Link></li>
          </ul>
        </div>
      )
    }
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      let currentSection = "";
      let currentSubSection = "";

      for (const section of sectionsData) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= window.scrollY + 100) {
          currentSection = section.id;
        }
      }
      setActiveSection(currentSection || "overview");

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
    handleScroll();

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
