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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto w-full">
            <div className="mb-4 sm:mb-6">
              <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50 shadow-sm text-center">
                No requiere tarjeta • gratis
              </span>
            </div>
            <h1 className="text-[30px] sm:text-[44px] md:text-[64px] lg:text-[80px] leading-[1.05] tracking-tight text-gray-900 mb-4 sm:mb-6">
              <span className="block text-base sm:text-lg md:text-xl lg:text-2xl font-sans font-medium text-gray-600 mb-1 sm:mb-2">Conoce a tu nuevo:</span>
              <span className="block">Agente de Ventas</span>
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


      {/* Statistics Section */}
      <ScrollAnimation delay={200}>
        <section className="py-8 sm:py-12 bg-white border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 w-full">
              <ScrollAnimation delay={600}>
                <div className="group p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 text-center max-w-xs w-full">
                  <div className="text-sm sm:text-base md:text-lg font-normal text-gray-700 mb-2">
                    <AnimatedCounter targetNumber={300000} />+
                  </div>
                  <div className="text-xs font-normal text-gray-600 mb-1">Empresas Ecuatorianas</div>
                  <p className="text-xs text-gray-500">Base de datos actualizada</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation delay={800}>
                <div className="group p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 text-center max-w-xs w-full">
                  <div className="text-sm sm:text-base md:text-lg font-normal text-gray-700 mb-2">
                    <AnimatedCounter targetNumber={1500000} />
                  </div>
                  <div className="text-xs font-normal text-gray-600 mb-1">Registros Financieros</div>
                  <p className="text-xs text-gray-500">Datos analizados por IA</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation delay={1000}>
                <div className="group p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 text-center max-w-xs w-full">
                  <div className="text-sm sm:text-base md:text-lg font-normal text-gray-700 mb-2">
                    <AnimatedCounter targetNumber={200000} />
                  </div>
                  <div className="text-xs font-normal text-gray-600 mb-1 flex items-center justify-center gap-1">
                    <span>Contactos</span>
                    <FaLinkedin className="h-3 w-3 text-[#0077B5]" />
                  </div>
                  <p className="text-xs text-gray-500 leading-tight">Perfiles de directivos, ejecutivos y empleados</p>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </ScrollAnimation>

      {/* AI Models Section */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-medium text-gray-800">
              Modelos
            </h2>
          </div>
          <div className="relative overflow-hidden">
            <div className="flex animate-marquee space-x-2 sm:space-x-3">
              {[
                "/logos/google-logo.svg",
                "/logos/openai-logo.png",
                "/logos/claude-logo.png",
                "/logos/meta-logo.png",
                "/logos/deepseek-logo.png",
                "/logos/groq-logo.png",
                "/logos/google-logo.svg",
                "/logos/openai-logo.png",
                "/logos/claude-logo.png",
                "/logos/meta-logo.png",
                "/logos/deepseek-logo.png",
                "/logos/groq-logo.png",
              ].map((logo, i) => {
                const isGoogle = logo.includes('google-logo');
                return (
                  <div key={i} className="flex-shrink-0 flex items-center justify-center p-3 bg-gray-50 rounded-lg" style={{ minWidth: isGoogle ? '80px' : '120px' }}>
                    <Image
                      src={logo}
                      alt={`Logo of ${logo.split('/')[2].split('.')[0]}`}
                      width={isGoogle ? 32 : 84}
                      height={isGoogle ? 32 : 84}
                      className="transition-all duration-300"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Combined with How it works */}
      <ScrollAnimation delay={200}>
        <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white to-slate-50/60">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
            <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3">
              Resuelve tus desafíos de prospección
            </h2>
            <p className="text-base sm:text-lg text-gray-500 mb-8 sm:mb-10">
              IA que encuentra, analiza y conecta por ti.
            </p>
            <div className="space-y-4 sm:space-y-5 text-left max-w-xl mx-auto">
              <p className="flex items-start gap-3 sm:gap-4 text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold text-center leading-5 mt-0.5">1</span>
                <span className="font-light text-sm sm:text-base">
                  <strong className="font-medium">Ahorra tiempo,</strong> olvídate de búsquedas manuales y obtén prospectos perfectos al instante.
                </span>
              </p>
              <p className="flex items-start gap-3 sm:gap-4 text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold text-center leading-5 mt-0.5">2</span>
                <span className="font-light text-sm sm:text-base">
                  <strong className="font-medium">Toma mejores decisiones,</strong> nuestra IA analiza finanzas y sugiere oportunidades reales para tu negocio.
                </span>
              </p>
              <p className="flex items-start gap-3 sm:gap-4 text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold text-center leading-5 mt-0.5">3</span>
                <span className="font-light text-sm sm:text-base">
                  <strong className="font-medium">Conecta directamente,</strong> accede a contactos y datos estratégicos para cierres más rápidos.
                </span>
              </p>
            </div>
          </div>
        </section>
      </ScrollAnimation>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {/* Company Info */}
            <div className="sm:col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo.svg" alt="Camella Icon" width={32} height={32} className="sm:w-10 sm:h-10" />
                <Image src="/camella-logo.svg" alt="Camella Logo" width={80} height={80} className="sm:w-24 sm:h-24" />
              </Link>
              <p className="text-gray-600 mb-4 max-w-md text-sm sm:text-base">
                Conecta y crece tu negocio con la plataforma más avanzada de conexiones empresariales en Ecuador, impulsada por Inteligencia Artificial.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <FaLinkedin className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="text-sm font-medium">Twitter</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="text-sm font-medium">Blog</span>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Producto</h3>
              <ul className="space-y-2">
                <li><Link href="/companies" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Empresas</Link></li>
                <li><Link href="/offerings" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Ofertas</Link></li>
                <li><Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Precios</Link></li>
                <li><Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Documentación</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Empresa</h3>
              <ul className="space-y-2">
                <li><Link href="/contacto" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Contacto</Link></li>
                <li><Link href="/carreras" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Carreras</Link></li>
                <li><Link href="/inversores" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">Inversores</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © 2025 Camella. Todos los derechos reservados.
            </p>
            <div className="flex space-x-4 sm:space-x-6 mt-4 sm:mt-0">
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">Privacidad</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">Términos</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
