"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { StarField } from "@/components/star-field";
import { AnimatedCounter } from "@/components/animated-counter";
import { ScrollAnimation } from "@/components/scroll-animation";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const MapGlobe = dynamic(() => import("@/components/map-globe").then(mod => ({ default: mod.MapGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white rounded-2xl border border-indigo-200/50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-indigo-600">Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default function HomeContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user:', error);
          return;
        }
        setUser(user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-white w-full overflow-hidden">
      {/* Navigation Header */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                <Image src="/logo.svg" alt="Camella Icon" width={24} height={24} className="sm:w-[30px] sm:h-[30px]" />
                <Image src="/camella-logo.svg" alt="Camella Logo" width={80} height={80} className="sm:w-[110px] sm:h-[110px]" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Precios
              </Link>
              <Link href="/inversores" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Inversores
              </Link>
              <Link href="/carreras" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Carreras
              </Link>
              <Link href="/docs" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">
                Documentación
              </Link>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all duration-200">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all duration-200">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMenu}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link
                  href="/pricing"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Precios
                </Link>
                <Link
                  href="/inversores"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Inversores
                </Link>
                <Link
                  href="/carreras"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Carreras
                </Link>
                <Link
                  href="/docs"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Documentación
                </Link>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  {user ? (
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button size="sm" className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                          Iniciar Sesión
                        </Button>
                      </Link>
                      <Link href="/auth/sign-up" onClick={() => setIsMenuOpen(false)}>
                        <Button size="sm" className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                          Registrarse
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
        <StarField className="opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 md:py-10 lg:py-12">
          <div className="text-center max-w-4xl mx-auto w-full">
            <div className="mb-4 sm:mb-6">
              <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50 shadow-sm text-center">
                No requiere tarjeta • gratis
              </span>
            </div>
            <h1 className="text-[30px] sm:text-[44px] md:text-[64px] lg:text-[80px] leading-[1.05] tracking-tight text-gray-900 mb-4 sm:mb-6">
              <span className="block text-base sm:text-lg md:text-xl lg:text-2xl font-sans font-medium text-gray-600 mb-1 sm:mb-2">Conoce a tu nuevo:</span>
              <span className="block">Agente Empresarial</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed font-medium px-2 text-center">
              Tu agente inteligente para encontrar y analizar oportunidades de negocios reales y aumentar tus ventas.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
              {user ? (
                <Link href="/dashboard">
                  <Button className="px-6 py-3 text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/sign-up">
                  <Button className="px-6 py-3 text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95">
                    Empezar Gratis
                  </Button>
                </Link>
              )}
              <Link href="/companies">
                <Button variant="outline" className="px-6 py-3 text-sm font-medium border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95">
                  Explorar Empresas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics and Globe Section */}
      <ScrollAnimation delay={200}>
        <section className="py-6 sm:py-8 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[18%_82%] gap-3 lg:gap-4 items-start">
              {/* Cards Column - Left Side */}
              <div className="space-y-2">
                {/* Stats in database column format */}
                <div className="flex flex-col gap-2">
                  <ScrollAnimation delay={400}>
                    <div className="bg-white border border-gray-200 p-2 text-center font-mono">
                      <div className="text-lg font-bold text-gray-900 mb-1 border-b border-gray-300 pb-1">
                        <AnimatedCounter targetNumber={300000} />+
                      </div>
                      <div className="text-xs text-gray-600 mb-1">EMPRESAS</div>
                      <div className="text-xs text-gray-400">ECUADOR</div>
                    </div>
                  </ScrollAnimation>
                  <ScrollAnimation delay={500}>
                    <div className="bg-white border border-gray-200 p-2 text-center font-mono">
                      <div className="text-lg font-bold text-gray-900 mb-1 border-b border-gray-300 pb-1">
                        <AnimatedCounter targetNumber={1500000} />
                      </div>
                      <div className="text-xs text-gray-600 mb-1">REGISTROS</div>
                      <div className="text-xs text-gray-400">FINANCIEROS</div>
                    </div>
                  </ScrollAnimation>
                  <ScrollAnimation delay={600}>
                    <div className="bg-white border border-gray-200 p-2 text-center font-mono">
                      <div className="text-lg font-bold text-gray-900 mb-1 border-b border-gray-300 pb-1">
                        <AnimatedCounter targetNumber={200000} />
                      </div>
                      <div className="text-xs text-gray-600 mb-1">CONTACTOS</div>
                      <div className="text-xs text-gray-400">LINKEDIN</div>
                    </div>
                  </ScrollAnimation>
                </div>
                {/* Countries card below */}
                <ScrollAnimation delay={700}>
                  <div className="bg-white border border-gray-200 p-2 font-mono">
                    <div className="text-xs text-gray-600 mb-2 text-center border-b border-gray-300 pb-1">PAÍSES</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-green-600 text-xs font-bold">✓</span>
                        <span className="text-xs font-medium text-gray-900">ECUADOR</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 mb-1 text-center">PRÓXIMAMENTE:</div>
                      <div className="flex flex-col gap-0.5">
                        {["COLOMBIA", "MÉXICO", "USA", "PARAGUAY", "CHILE"].map((country) => (
                          <div key={country} className="flex items-center justify-center gap-2">
                            <span className="text-gray-300 text-xs">○</span>
                            <span className="text-xs text-gray-400">{country}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              </div>

              {/* Globe Column - Right Side - Center Stage */}
              <ScrollAnimation delay={300}>
                <div className="flex justify-center items-center h-full">
                  <div className="w-full max-w-2xl h-[400px] sm:h-[500px] lg:h-[600px] min-h-[400px]">
                    <MapGlobe />
                  </div>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </ScrollAnimation>


      {/* Features Section - Database Style */}
      <ScrollAnimation delay={200}>
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 font-mono">
                PROCESO DE PROSPECCIÓN
              </h2>
              <p className="text-sm text-gray-600 font-mono">
                IA que encuentra, analiza y conecta por ti.
              </p>
            </div>

            <div className="space-y-1 max-w-2xl mx-auto">
              <ScrollAnimation delay={400}>
                <div className="bg-white border border-gray-200 p-3 font-mono">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 text-xs font-bold mt-0.5">01</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1 border-b border-gray-300 pb-1">
                        AHORRA TIEMPO
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed">
                        Olvídate de búsquedas manuales y obtén prospectos perfectos al instante.
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollAnimation>

              <ScrollAnimation delay={500}>
                <div className="bg-white border border-gray-200 p-3 font-mono">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 text-xs font-bold mt-0.5">02</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1 border-b border-gray-300 pb-1">
                        TOMA MEJORES DECISIONES
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed">
                        Nuestra IA analiza finanzas y sugiere oportunidades reales para tu negocio.
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollAnimation>

              <ScrollAnimation delay={600}>
                <div className="bg-white border border-gray-200 p-3 font-mono">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xs font-bold mt-0.5">03</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1 border-b border-gray-300 pb-1">
                        CONECTA DIRECTAMENTE
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed">
                        Accede a contactos y datos estratégicos para cierres más rápidos.
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </ScrollAnimation>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Company Info */}
            <div className="sm:col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <Image src="/logo.svg" alt="Camella Icon" width={24} height={24} className="sm:w-8 sm:h-8" />
                <Image src="/camella-logo.svg" alt="Camella Logo" width={60} height={60} className="sm:w-20 sm:h-20" />
              </Link>
              <p className="text-gray-600 mb-3 max-w-md text-xs sm:text-sm">
                Conecta y crece tu negocio con la plataforma más avanzada de conexiones empresariales en Ecuador, impulsada por Inteligencia Artificial.
              </p>
              <div className="flex space-x-3">
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <FaLinkedin className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="text-xs">Twitter</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="text-xs">Blog</span>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-xs sm:text-sm">Producto</h3>
              <ul className="space-y-1.5">
                <li><Link href="/companies" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Empresas</Link></li>
                <li><Link href="/offerings" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Ofertas</Link></li>
                <li><Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Precios</Link></li>
                <li><Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Documentación</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-xs sm:text-sm">Empresa</h3>
              <ul className="space-y-1.5">
                <li><Link href="/contacto" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Contacto</Link></li>
                <li><Link href="/carreras" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Carreras</Link></li>
                <li><Link href="/inversores" className="text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm">Inversores</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-4 sm:mt-6 pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-600 text-xs">
              © 2025 Camella. Todos los derechos reservados.
            </p>
            <div className="flex space-x-3 sm:space-x-4 mt-3 sm:mt-0">
              <a href="#" className="text-gray-600 hover:text-gray-900 text-xs transition-colors">Privacidad</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-xs transition-colors">Términos</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-xs transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
