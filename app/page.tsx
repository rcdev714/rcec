import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Database, Brain, Target, Search, Filter, MessageSquare, Rocket } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { StarField } from "@/components/star-field";
import { AnimatedCounter } from "@/components/animated-counter";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.svg" alt="Camella Logo" width={40} height={40} />
                <span className="text-white font-semibold tracking-tight">Camella</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pricing">
                <Button variant="ghost" size="sm" className="text-white hover:font-bold transition-all duration-200">Ver planes</Button>
              </Link>
              {user ? (
                <></>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="text-white hover:font-bold transition-all duration-200">Iniciar Sesión</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" className="bg-white text-black hover:bg-gray-200">Registrarse</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black">
        <StarField className="opacity-70" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-36 lg:py-48">
          <div className="text-center">
            <h1 className="font-kalice text-[48px] md:text-[72px] xl:text-[96px] leading-[1.12] mt-4 tracking-tight text-white">
              Conecta y crece tu negocio
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-white/85 max-w-3xl mx-auto leading-relaxed">
              La forma más fácil de encontrar y conectar con empresas ecuatorianas con ayuda de Inteligencia Artificial
            </p>
            <div className="mt-10 flex flex-col items-center">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" variant="default" className="group px-8 py-6 text-lg bg-white text-black hover:bg-gray-100 shadow-lg transition-all">
                    Encontrar Empresas
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/sign-up">
                  <Button size="lg" variant="default" className="group px-8 py-6 text-lg bg-white text-black hover:bg-gray-100 shadow-lg transition-all">
                    Empezar Gratis
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              )}
              <p className="mt-3 text-base text-white/80">Prueba gratuita — no necesitas tarjeta</p>
            </div>
          </div>
        </div>
      </section>


      {/* Statistics Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl sm:text-5xl font-medium text-gray-900 mb-2">
                <AnimatedCounter targetNumber={300000} />+
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Empresas Ecuatorianas
              </div>
              <div className="text-xs text-gray-500 mt-1">
                En nuestra base de datos
              </div>
            </div>
            <div className="p-6">
              <div className="text-4xl sm:text-5xl font-medium text-gray-900 mb-2">
                <AnimatedCounter targetNumber={1500000} />
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                Registros Financieros
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Datos actualizados y verificados
              </div>
            </div>
            <div className="p-6">
              <div className="text-4xl sm:text-5xl font-medium text-gray-900 mb-2">
                <AnimatedCounter targetNumber={200000} />
              </div>
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
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900">
              Todo lo que necesitas para encontrar y vender a empresas ecuatorianas
            </h2>
            <p className="mt-4 text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              Nuestra plataforma combina datos empresariales actualizados con inteligencia artificial 
              para potenciar tu estrategia comercial.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="h-8 w-8 text-gray-900" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Base de Datos Completa
              </h3>
              <p className="text-gray-700">
                Accede a información actualizada de miles de empresas ecuatorianas 
                con datos de contacto, financieros y comerciales.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-gray-900" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Agente de IA Personal
              </h3>
              <p className="text-gray-700">
                Tu asistente inteligente analiza datos, identifica oportunidades 
                y te ayuda a crear estrategias de venta personalizadas.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-gray-900" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Targeting Inteligente
              </h3>
              <p className="text-gray-700">
                Encuentra exactamente las empresas que necesitas con filtros 
                avanzados y recomendaciones basadas en IA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900">¿Cómo funciona?</h2>
            <p className="mt-4 text-gray-700 max-w-2xl mx-auto text-lg">De cero a prospectos calificados en minutos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-gray-900" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Busca</h3>
              <p className="mt-2 text-gray-700">Escribe lo que buscas o usa filtros avanzados por industria, tamaño y ubicación.</p>
            </div>
            <div className="p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Filter className="h-6 w-6 text-gray-900" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Refina</h3>
              <p className="mt-2 text-gray-700">Nuestro agente de IA entiende tu contexto y sugiere segmentos con mayor potencial.</p>
            </div>
            <div className="p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-gray-900" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Conecta</h3>
              <p className="mt-2 text-gray-700">Accede a contactos clave y planifica tu acercamiento con insights accionables.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-black text-white p-8 sm:p-12 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/10 ring-1 ring-white/20 text-sm">
                <Rocket className="h-4 w-4" />
                <span>Empieza hoy</span>
              </div>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">Lanza tu prospección con IA</h3>
              <p className="mt-3 text-white/80 max-w-2xl">Prueba la plataforma y descubre nuevos clientes en minutos.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={user ? "/dashboard" : "/auth/sign-up"}>
                  <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">Comenzar</Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="px-8 py-3 bg-white text-lg text-black">Ver planes</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
