"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, Search, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

// Video component that autoplays when scrolled into view
function AutoplayVideo({ 
  src, 
  poster, 
  preload = "metadata",
  className = "",
  priority = false 
}: { 
  src: string; 
  poster: string; 
  preload?: "auto" | "metadata" | "none";
  className?: string;
  priority?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPlayedRef.current) {
            video.play().catch((err) => {
              // Silently handle autoplay errors (browser may block autoplay)
              console.debug('Video autoplay prevented:', err);
            });
            hasPlayedRef.current = true;
          } else if (!entry.isIntersecting && hasPlayedRef.current) {
            // Pause when out of view to save resources
            video.pause();
            hasPlayedRef.current = false;
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of video is visible
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      preload={preload}
      autoPlay={priority}
      loop
      muted
      playsInline
      controls
    />
  );
}

// Typewriter hook
const useTypewriter = (phrases: string[], typingSpeed = 50, deletingSpeed = 12, pauseDuration = 1200) => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    
    const handleTyping = () => {
      if (isDeleting) {
        setText((prev) => prev.slice(0, -1));
        if (text === "") {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      } else {
        setText((prev) => currentPhrase.slice(0, prev.length + 1));
        if (text === currentPhrase) {
          setTimeout(() => setIsDeleting(true), pauseDuration);
          return;
        }
      }
    };

    const timer = setTimeout(
      handleTyping,
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timer);
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return text;
};

// Feature data for the scrolling section
const features = [
  {
    id: "analysis",
    title: "Inteligencia Empresarial Instantánea",
    description: "Busca, analiza y conecta con más de 300K empresas en segundos.",
    videoSrc: "/landingpagedemos/DemoAgente1.mp4",
    poster: "/heroImage.jpg",
    tags: ["Búsqueda", "Análisis financiero", "Contactos directos"]
  },
  {
    id: "search",
    title: "Base de datos de empresas",
    description: "Encuentra prospectos ideales en segundos. Filtra por industria, ubicación y tamaño.",
    videoSrc: "/landingpagedemos/companiesDbDemo.mp4",
    poster: "/HeroImage.jpeg",
    tags: ["300K+ empresas", "Filtros avanzados", "Tiempo real"]
  },
  {
    id: "management",
    title: "Catálogo de Servicios",
    description: "Crea y comparte un catálogo público. La IA usa este contexto para mejorar el targeting.",
    videoSrc: "/landingpagedemos/CatalogoServiciosDemo.mp4",
    poster: "/HeroImage.jpeg",
    tags: ["Catálogo público", "Targeting IA", "Personalización"]
  }
];

type HomeContentProps = {
  initialUser?: User | null;
};

const SEARCH_PHRASES = [
  "Busca personas en LinkedIn que trabajen en Unibrokers SA",
  "Encuentra empresas de manufactura en Quito",
  "Analiza RUC 1790016919001",
  "Proveedores de alimentos > $100k",
  "Salud financiera: Corporación Favorita",
  "Competencia farmacéutica en Cuenca",
  "Exportadores de banano en El Oro",
  "Oportunidades inmobiliarias en Manta"
];

export default function HomeContent({ initialUser = null }: HomeContentProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser);
  const typewriterText = useTypewriter(SEARCH_PHRASES);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const syncUser = async () => {
      if (initialUser) {
        setUser(initialUser);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) {
          setUser(user ?? null);
        }
      } catch (error: any) {
        // Gracefully handle missing/invalid refresh tokens (expected for non-authenticated users)
        if (error?.status === 400 && error?.code === 'refresh_token_not_found') {
          // This is expected when user is not authenticated - silently handle it
          if (isMounted) {
            setUser(null);
          }
        } else {
          // Log other errors
          console.error('Error fetching user:', error);
        }
      }
    };

    syncUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialUser]);

  // Preload the first video for faster loading
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = '/landingpagedemos/DemoAgente1.mp4';
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden font-inter text-gray-900 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-7 h-7 transition-transform duration-300 group-hover:scale-105">
                <Image src="/logo.svg" alt="Camella Icon" fill className="object-contain" />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {["Inversores", "Carreras", "Documentación"].map((item) => (
                <Link 
                  key={item}
                  href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-9 text-xs font-medium transition-all shadow-sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-9 text-xs font-medium transition-all shadow-sm">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={toggleMenu} className="text-gray-900">
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-16 left-0 w-full bg-white border-b border-gray-100 md:hidden overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {["Precios", "Inversores", "Carreras", "Documentación"].map((item) => (
                  <Link
                    key={item}
                    href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                    className="block text-base font-medium text-gray-600 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item}
                  </Link>
                ))}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  {user ? (
                    <Link href="/dashboard">
                      <Button className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Dashboard</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/auth/login">
                        <Button variant="ghost" className="w-full justify-start text-sm">Iniciar Sesión</Button>
                      </Link>
                      <Link href="/auth/sign-up">
                        <Button className="w-full rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700">Registrarse</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow pt-24 pb-16">
        {/* Search Engine Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[70vh] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-2xl"
          >
            {/* Logo/Title */}
            <h1 className="text-3xl sm:text-6xl font-bold tracking-tight text-indigo-600 mb-2 sm:mb-3">
              Camella
            </h1>
            
            <p className="text-sm sm:text-lg text-gray-500 font-medium mb-6 sm:mb-10 tracking-tight">
              Motor de Búsqueda Empresarial
            </p>

            {/* Search Input Simulation */}
            <div className="relative group w-full mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center w-full h-12 sm:h-16 px-4 sm:px-6 bg-white border border-gray-200 rounded-full shadow-lg shadow-gray-200/50 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 ring-0 ring-indigo-100 focus-within:ring-4">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="flex-grow min-w-0 text-left text-sm sm:text-lg text-gray-600 font-medium overflow-hidden whitespace-nowrap">
                  {typewriterText}
                  <span className="animate-pulse text-indigo-500">|</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
              <Link href={user ? "/dashboard" : "/auth/sign-up"} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 rounded-full text-xs sm:text-base font-medium bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200 shadow-sm transition-all hover:border-gray-300">
                  {user ? "Ir a mi Dashboard" : "Buscar"}
                </Button>
              </Link>
            </div>

            {/* Subtext */}
            <p className="text-xs sm:text-sm text-gray-500 font-light px-4">
              <br className="hidden sm:block" />
              <span className="mt-2 block sm:inline-block">
                Disponible en <span className="font-medium text-gray-700">Ecuador 🇪🇨</span> · Próximamente en toda America <span className="opacity-60">🇲🇽 🇵🇪 🇨🇱 🇦🇷 🇧🇷 🇺🇸 🇨🇴</span>
              </span>
            </p>
          </motion.div>
        </section>

        {/* Feature Story Section - Clean & Minimal */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20 sm:space-y-32">
          {features.map((feature, index) => (
            <div key={feature.id} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-24 items-center`}>
              
              {/* Text Content */}
              <motion.div
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="flex-1 space-y-4 sm:space-y-6 text-center lg:text-left w-full"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] sm:text-xs font-medium text-indigo-700">
                  {feature.tags[0]}
                </div>
                <h3 className="text-2xl sm:text-4xl font-semibold text-gray-900 tracking-tight leading-tight">
                  {feature.title}
                </h3>
                <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  {feature.description}
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start pt-2">
                  {feature.tags.slice(1).map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full border border-gray-200 bg-white text-[10px] sm:text-xs text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-4 flex justify-center lg:justify-start">
                  <Link href="/auth/sign-up" className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-700 hover:underline underline-offset-4 transition-all text-sm sm:text-base">
                    Probar ahora <ArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </motion.div>

              {/* Video Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className={index > 0 ? "flex-[2.1] w-full lg:max-w-6xl" : "flex-1 w-full lg:max-w-4xl"}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl shadow-gray-200 border border-gray-100 bg-white w-full">
                  <AutoplayVideo
                    src={feature.videoSrc}
                    poster={feature.poster}
                    preload={feature.id === "analysis" ? "auto" : "metadata"}
                    priority={feature.id === "analysis"}
                    className="w-full h-auto"
                  />
                </div>
              </motion.div>
            </div>
          ))}
        </section>

        {/* Final CTA */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 sm:py-24 mt-8 sm:mt-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
              Empieza a buscar hoy.
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Únete a las empresas que ya están utilizando Camella para conectar y crecer. 5 USD de crédito gratis al registrarte.
            </p>
            <Link href="/auth/sign-up" className="inline-block w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 text-sm sm:text-base font-medium shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all">
                Crear cuenta gratis
              </Button>
            </Link>
          </div>
        </section>
        
        {/* Simple Footer */}
        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Logo" width={24} height={24} className="opacity-80" />
              <span className="font-semibold text-gray-700">Camella</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-gray-500">
              <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Precios</Link>
              <Link href="/companies" className="hover:text-indigo-600 transition-colors">Empresas</Link>
              <Link href="/contacto" className="hover:text-indigo-600 transition-colors">Contacto</Link>
              <Link href="/login" className="hover:text-indigo-600 transition-colors">Login</Link>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              © 2025 Camella Inc.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
