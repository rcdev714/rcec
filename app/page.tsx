import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Database, Brain, Target } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Acquira
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm">
                      Consola
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="sm">
                      Planes
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
              La base de datos más{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-black">
                completa
              </span>{" "}
              de empresas ecuatorianas
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Encuentra y conecta con empresas ecuatorianas usando tu agente de IA personal. 
              Acelera tus ventas con insights inteligentes y datos actualizados.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-white hover:bg-gray-200 text-black border border-gray-300 px-8 py-3">
                      Ir a Consola
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" size="lg" className="px-8 py-3">
                      Ver Planes
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/sign-up">
                    <Button size="lg" className="bg-black hover:bg-gray-800 text-white px-8 py-3">
                      Comenzar Gratis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button variant="outline" size="lg" className="px-8 py-3">
                      Iniciar Sesión
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">+300,000</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Empresas Ecuatorianas
              </div>
              <div className="text-xs text-gray-500 mt-1">
                En nuestra base de datos
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">1.5M</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Registros Financieros
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Datos actualizados y verificados
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">200,000</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Contactos LinkedIn
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Perfiles profesionales disponibles
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Todo lo que necesitas para encontrar y vender a empresas ecuatorianas
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Nuestra plataforma combina datos empresariales actualizados con inteligencia artificial 
              para potenciar tu estrategia comercial.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="h-8 w-8 text-gray-900" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Base de Datos Completa
              </h3>
              <p className="text-gray-600">
                Accede a información actualizada de miles de empresas ecuatorianas 
                con datos de contacto, financieros y comerciales.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-gray-900" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Agente de IA Personal
              </h3>
              <p className="text-gray-600">
                Tu asistente inteligente analiza datos, identifica oportunidades 
                y te ayuda a crear estrategias de venta personalizadas.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-gray-900" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Targeting Inteligente
              </h3>
              <p className="text-gray-600">
                Encuentra exactamente las empresas que necesitas con filtros 
                avanzados y recomendaciones basadas en IA.
              </p>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
