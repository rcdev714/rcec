"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, Upload, FileText } from "lucide-react";
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

interface JobDetailPageProps {
  jobId: string;
}

export default function JobDetailPage({ jobId }: JobDetailPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    message: '',
    cv: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const navigationItems = [
    { href: "/pricing", label: "Precios" },
    { href: "/inversores", label: "Inversores" },
    { href: "/carreras", label: "Carreras" },
    { href: "/docs", label: "Documentación" },
  ];

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
    const fetchJob = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Job not found');
        }
        const jobData = await response.json();
        setJob(jobData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF');
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('El archivo no debe exceder 5MB');
      return;
    }
    setFormData(prev => ({
      ...prev,
      cv: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.message) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('jobId', jobId);
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('linkedin_url', formData.linkedin_url);
      formDataToSend.append('message', formData.message);
      if (formData.cv) {
        formDataToSend.append('cv', formData.cv);
      }

      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert(`Error al enviar la solicitud: ${error instanceof Error ? error.message : 'Por favor intenta de nuevo.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando posición...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Posición no encontrada</h1>
          <p className="text-gray-600 mb-6">La posición que buscas no existe o ha sido eliminada.</p>
          <Link href="/carreras">
            <Button>Volver a Carreras</Button>
          </Link>
        </div>
      </div>
    );
  }

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

      {/* Job Detail Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Job Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/carreras" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                ← Volver a Carreras
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
          </div>

          {/* Job Description */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Sobre la posición</h2>
                <p className="text-gray-700 leading-relaxed">{job.description}</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Responsabilidades</h2>
                <div className="text-gray-700 whitespace-pre-line">{job.responsibilities}</div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Requisitos</h2>
                <div className="text-gray-700 whitespace-pre-line">{job.requirements}</div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Beneficios</h2>
                <div className="text-gray-700 whitespace-pre-line">{job.benefits}</div>
              </div>
            </div>

            {/* Application Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {!isSubmitted ? (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Aplicar a esta posición</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre *
                          </label>
                          <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                            placeholder="Juan"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Apellido *
                          </label>
                          <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                            placeholder="Pérez"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Correo electrónico *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                          placeholder="tu@email.com"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                            placeholder="0991234567"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            LinkedIn
                          </label>
                          <input
                            type="url"
                            name="linkedin_url"
                            value={formData.linkedin_url}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                            placeholder="linkedin.com/in/..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mensaje *
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          required
                          rows={4}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none text-sm"
                          placeholder="Cuéntanos por qué eres el candidato ideal..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CV (PDF, máximo 5MB)
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors bg-gray-50">
                            <div className="text-center">
                              {formData.cv ? (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-green-600" />
                                  <span className="text-sm text-gray-700">{formData.cv.name}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Upload className="w-5 h-5 text-gray-400" />
                                  <span className="text-sm text-gray-500">Haz clic para seleccionar tu CV</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 font-medium"
                      >
                        {isSubmitting ? 'Enviando...' : 'Enviar aplicación'}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-100 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      ¡Aplicación enviada!
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Gracias por tu interés. Revisaremos tu aplicación y nos pondremos en contacto pronto.
                    </p>
                    <Link href="/carreras">
                      <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                        Ver otras posiciones
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
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
