"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";

export default function InvestorsContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [_isContactVisible, _setIsContactVisible] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    email: string;
    message: string;
    company: string;
    investorId: string;
  }>({
    email: '',
    message: '',
    company: '',
    investorId: ''
  });
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('inversores')
        .insert([
          {
            email: formData.email,
            message: formData.message,
            company: formData.company || null,
            investor_id: formData.investorId,
          }
        ]);

      if (error) throw error;

      setIsFormSubmitted(true);
      _setIsContactVisible(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al enviar el formulario. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Image src="/logo.svg" alt="Camella Icon" width={24} height={24} className="sm:w-[30px] sm:h-[30px]" />
              <Image src="/camella-logo.svg" alt="Camella Logo" width={80} height={80} className="sm:w-[110px] sm:h-[110px]" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
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
                    className="block px-3 py-2 text-base text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
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

      {/* Investors Hero Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-gray-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-xs mb-4">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span>
            Ronda de financiación inicial
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl leading-tight text-gray-900 mb-8">
            Formulario Inversores
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto mb-8">
            Buscamos inversores estratégicos que aporten valor más allá del capital
          </p>

          {/* Contact Form */}
          <div className="max-w-lg mx-auto">
            {!isFormSubmitted ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                <div className="text-center mb-8">
                  <h3 className="text-lg text-gray-900 mb-2">
                    Solicitud de inversión
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Envíanos tus datos para agendar una reunión
                  </p>
                  <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-full text-xs">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                    </svg>
                    Plazas limitadas disponibles
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
                        Correo electrónico *
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-sm"
                        placeholder="tu@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm text-gray-700 mb-2">
                        Experiencia y contribución *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all duration-200 resize-none text-sm"
                        placeholder="Describe tu experiencia en B2B SaaS, redes estratégicas y cómo puedes contribuir al crecimiento de Camella..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="company" className="block text-sm text-gray-700 mb-2">
                          Compañía/Fondo
                        </label>
                        <input
                          id="company"
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-sm"
                          placeholder="Opcional"
                        />
                      </div>

                      <div>
                        <label htmlFor="investorId" className="block text-sm text-gray-700 mb-2">
                          Cédula/ID *
                        </label>
                        <input
                          id="investorId"
                          type="text"
                          name="investorId"
                          value={formData.investorId}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-sm"
                          placeholder="Número de identificación"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-medium"
                    >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando solicitud...
                      </div>
                    ) : (
                      'Enviar'
                    )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-green-200 shadow-lg text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg text-gray-900 mb-2">
                  Solicitud recibida
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Gracias por tu interés. Hemos recibido tu solicitud correctamente.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-xs">
                    Contactaremos solo a candidatos preseleccionados para agendar reuniones.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What We Look For Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 border border-gray-200 shadow-sm mb-6">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-gray-700 text-sm font-medium">Perfil ideal del inversor</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-5 border border-gray-100">
              <h3 className="text-gray-900 text-sm mb-2">Experiencia B2B SaaS</h3>
              <p className="text-gray-600 text-sm">
                Conocimiento del sector y modelos escalables
              </p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-gray-100">
              <h3 className="text-gray-900 text-sm mb-2">Redes estratégicas</h3>
              <p className="text-gray-600 text-sm">
                Conexiones con partners y empresas relevantes
              </p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-gray-100">
              <h3 className="text-gray-900 text-sm mb-2">Valores compartidos</h3>
              <p className="text-gray-600 text-sm">
                Innovación y ética empresarial
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image src="/logo.svg" alt="Camella Icon" width={24} height={24} />
              <Image src="/camella-logo.svg" alt="Camella Logo" width={60} height={60} />
              <span className="text-gray-600 text-xs ml-1">© 2025 Camella</span>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/contacto" className="text-gray-600 hover:text-gray-900 transition-colors text-xs">
                Contacto
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors text-xs">
                Documentación
              </Link>
              <a href="https://linkedin.com/company/camella" className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaLinkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
