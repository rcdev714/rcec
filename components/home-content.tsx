"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";

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

// Feature data for the scrolling section
const features = [
  {
    id: "analysis",
    title: "Inteligencia Empresarial Instantánea",
    description: "Busca, analiza y conecta con más de 300K empresas en segundos. Obtén información financiera, contactos directos y análisis profundo de cualquier empresa con solo preguntar.",
    videoSrc: "/landingpagedemos/DemoAgente1.mp4",
    poster: "/heroImage.jpg",
    tags: ["Busqueda de empresas", "Análisis financiero", "Procesamiento de lenguaje natural", "Conecta con decision makers"]
  },
  {
    id: "search",
    title: "Base de datos de empresas",
    description: "Encuentra prospectos ideales en segundos. Filtra por industria, ubicación y tamaño con nuestra base de datos de más de 300,000 empresas.",
    videoSrc: "/landingpagedemos/companiesDbDemo.mp4",
    poster: "/HeroImage.jpeg",
    tags: ["Base de datos en tiempo real", "Filtros avanzados", "Análisis financiero", "Contactos directos reales"]
  },
  {
    id: "management",
    title: "Catálogo de Servicios",
    description: "Crea y comparte un catálogo de servicios público con un link para ofrecer a tus leads. La IA usa este contexto para mejorar el targeting de posibles clientes y personalizar recomendaciones.",
    videoSrc: "/landingpagedemos/CatalogoServiciosDemo.mp4",
    poster: "/HeroImage.jpeg",
    tags: ["Catálogo público", "Compartir servicios", "Targeting IA", "Personalización leads"]
  }
];

type HomeContentProps = {
  initialUser?: User | null;
};

export default function HomeContent({ initialUser = null }: HomeContentProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser);

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
    <div className="min-h-screen bg-[#FAFAFA] w-full overflow-x-hidden font-inter text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-6 h-6 transition-transform duration-300 group-hover:scale-105">
                <Image src="/logo.svg" alt="Camella Icon" fill className="object-contain" />
              </div>
              <span className="font-medium text-lg tracking-tight text-gray-900">Camella</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {["Precios", "Inversores", "Carreras", "Documentación"].map((item) => (
                <Link 
                  key={item}
                  href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                  className="text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-9 text-xs font-medium transition-all">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="text-xs font-medium text-gray-500 hover:text-gray-900">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" className="rounded-full bg-indigo-600 hover:bg-gray-700 text-white px-5 h-9 text-xs font-medium transition-all">
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
        {isMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-100 md:hidden animate-in slide-in-from-top-5">
            <div className="p-4 space-y-4">
              {["Precios", "Inversores", "Carreras", "Documentación"].map((item) => (
                <Link
                  key={item}
                  href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                  className="block text-sm font-medium text-gray-600"
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
                      <Button className="w-full rounded-full bg-gray-900 text-white text-sm">Registrarse</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-6 lg:px-8 text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 mb-3">
              <span>USD $5 gratis en uso · Sin tarjeta requerida</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-gray-900 mb-3 leading-[1.1]">
              Agente Empresarial
            </h1>
            
            <p className="max-w-xl mx-auto text-base sm:text-lg text-gray-500 mb-4 leading-relaxed font-light">
              Busca, audita y conecta con empresas, sin terceros y a la velocidad de la luz.
              
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={user ? "/dashboard" : "/auth/sign-up"}>
                <Button className="h-10 px-6 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md">
                  {user ? "Ir al Dashboard" : "Empezar Gratis"}
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Feature Story Section */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 mb-24 space-y-16">
          {features.map((feature) => (
            <div key={feature.id} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4 }}
                className="space-y-3 text-center max-w-3xl mx-auto"
              >
                <h3 className="text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
                  {feature.description}
                </p>
                <div className="flex flex-wrap gap-2 justify-center text-[11px] text-gray-500 pt-1">
                  {feature.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full border border-gray-200 bg-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4 }}
                className={(feature.id === "search" || feature.id === "management") ? "max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto relative overflow-hidden rounded-xl border border-gray-200 bg-white" : "max-w-2xl mx-auto relative overflow-hidden rounded-xl border border-gray-200 bg-white"}
              >
                <AutoplayVideo
                  src={feature.videoSrc}
                  poster={feature.poster}
                  preload={feature.id === "analysis" ? "auto" : "metadata"}
                  priority={feature.id === "analysis"}
                  className="w-full h-auto object-contain"
                />
              </motion.div>
            </div>
          ))}
        </section>

        {/* Promo CTA */}
        <section className="max-w-4xl mx-auto px-6 lg:px-8 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 text-center"
          >
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
              Promo de lanzamiento
            </p>
            <h3 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-4">
              Recibe USD $5 para usar Gemini 3 Pro gratis
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Activa tu cuenta y prueba las búsquedas y el agente sin costo. Los créditos se asignan de inmediato.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={user ? "/dashboard" : "/auth/sign-up"} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-11 px-8 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
                  {user ? "Ir al Dashboard" : "Reclamar crédito"}
                </Button>
              </Link>
              {!user && (
                <Link href="/auth/login" className="text-xs text-gray-500 hover:text-gray-900">
                  Ya tienes cuenta? Inicia sesión
                </Link>
              )}
            </div>
          </motion.div>
        </section>

        {/* Simple Footer */}
        <footer className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
              <Image src="/logo.svg" alt="Logo" width={24} height={24} />
              <span className="font-medium text-sm text-gray-900">Camella</span>
            </div>
            <div className="flex gap-6 text-xs text-gray-500">
              <Link href="/pricing" className="hover:text-gray-900">Precios</Link>
              <Link href="/companies" className="hover:text-gray-900">Empresas</Link>
              <Link href="/contacto" className="hover:text-gray-900">Contacto</Link>
              <Link href="/login" className="hover:text-gray-900">Login</Link>
            </div>
            <p className="text-xs text-gray-400">
              © 2025 Perceptron Labs.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
