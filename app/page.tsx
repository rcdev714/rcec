import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Database, Brain, Target } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import Image from "next/image";

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
                <></>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" variant="secondary">
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
      <section className="relative overflow-hidden bg-black">
        <Image
          src="/HeroImage.jpeg"
          alt="Hero Background"
          fill
          className="object-contain object-center"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              Encuentra Empresas Ecuatorianas con Inteligencia Artificial
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white max-w-3xl mx-auto leading-relaxed">
              Nuestra plataforma utiliza inteligencia artificial para analizar
              millones de registros públicos y ayudarte a encontrar las empresas
              que necesitas para tu negocio.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                      Encontrar Empresas
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
                      Ver planes
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/sign-up">
                    <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                      Encontrar Empresas
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
                      Ver planes
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
              <div className="text-sm text-gray-600 uppercase tracking-wide flex items-center justify-center space-x-1">
                <span>Contactos</span>
                <FaLinkedin className="h-5 w-5 text-[#0077B5]" />
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
