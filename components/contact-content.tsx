"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";

export default function ContactContent() {
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

  const navigationItems = [
    { href: "/pricing", label: "Precios" },
    { href: "/inversores", label: "Inversores" },
    { href: "/carreras", label: "Carreras" },
    { href: "/docs", label: "Documentación" },
  ];

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
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
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
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
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

      {/* Contact Hero Section */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-white to-gray-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-kalice text-5xl sm:text-6xl md:text-7xl leading-tight text-gray-900 mb-8">
            Ponte en contacto
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 max-w-2xl mx-auto mb-6">
            Estamos construyendo el futuro de la comunicación B2B
          </p>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Únete a la revolución que está transformando cómo las empresas se conectan y hacen negocios
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 sm:py-20 bg-white -mt-8 relative z-10">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Envíanos un mensaje
              </h2>
              <p className="text-gray-600 text-sm">
                Estamos aquí para ayudarte
              </p>
            </div>

            <form className="space-y-6">
              <div className="space-y-4">
                <input
                  type="email"
                  name="email"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                  placeholder="Correo electrónico"
                />

                <textarea
                  name="message"
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none text-sm"
                  placeholder="Tu mensaje..."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200 py-3 font-medium"
              >
                Enviar mensaje
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <Image src="/logo.svg" alt="Camella Icon" width={28} height={28} />
              <Image src="/camella-logo.svg" alt="Camella Logo" width={70} height={70} />
              <span className="text-gray-600 text-sm ml-2">© 2025 Camella</span>
            </div>

            <div className="flex items-center space-x-6">
              <Link href="/contacto" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Contacto
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Documentación
              </Link>
              <a href="https://linkedin.com/company/camella" className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaLinkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
