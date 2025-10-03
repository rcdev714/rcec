"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  work_model: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  salary_range?: string;
  is_active: boolean;
  application_deadline?: string;
  created_at: string;
  updated_at: string;
}

export default function CarrerasContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/jobs');
        if (response.ok) {
          const jobsData = await response.json();
          setJobs(jobsData);
        } else {
          console.error('Failed to fetch jobs');
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
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

      {/* Careers Hero Section */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-white to-gray-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-kalice text-5xl sm:text-6xl md:text-7xl leading-tight text-gray-900 mb-8">
            Únete a nuestro equipo
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 max-w-2xl mx-auto mb-6">
            Estamos construyendo el futuro de la comunicación B2B
          </p>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Sé parte del equipo que está revolucionando cómo las empresas se conectan y hacen negocios
          </p>
        </div>
      </section>

      {/* Open Positions Section */}
      <section className="py-16 sm:py-20 bg-white -mt-8 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">Posiciones disponibles</h2>
            <p className="text-lg text-gray-600">Únete a nosotros y ayuda a construir el futuro del B2B</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No hay posiciones disponibles en este momento.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {jobs.map((job) => (
                <Link key={job.id} href={`/carreras/${job.id}`} className="block">
                  <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {job.employment_type}
                          </span>
                          <span className="flex items-center gap-1">
                            {job.work_model === 'Remoto' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            ) : job.work_model === 'Presencial' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                            {job.work_model}
                          </span>
                        </div>
                        <p className="text-gray-600">
                          {job.description.length > 150
                            ? `${job.description.substring(0, 150)}...`
                            : job.description
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-indigo-600 font-medium">Ver detalles →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">¿No encuentras la posición perfecta?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Envíanos tu CV de todos modos. Siempre estamos buscando talento excepcional.
              </p>
              <Button className="bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 px-6 py-2">
                Enviar CV
              </Button>
            </div>
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
