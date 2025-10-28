"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AuthHeroProps {
  heading?: string;
  subheading?: string;
  imageSrc?: string;
  logoSrc?: string;
  imageAlt?: string;
}

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  hero?: AuthHeroProps;
  className?: string;
  showHero?: boolean;
}

const DEFAULT_HERO_PROPS: Required<AuthHeroProps> = {
  heading: "Busca, analiza y conecta con empresas, rápido.",
  subheading: "",
  imageSrc: "/heroImage.jpg",
  logoSrc: "/logo.svg",
  imageAlt: "Hero background image showcasing business analytics",
};

export function AuthLayout({
  children,
  title,
  subtitle,
  hero,
  className,
  showHero = true
}: AuthLayoutProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const heroProps = { ...DEFAULT_HERO_PROPS, ...hero };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background grid lg:grid-cols-2 transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      role="main"
      aria-labelledby="auth-title"
    >
      {/* Left column: form */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10">
        {/* Skip link for accessibility */}
        <a
          href="#auth-form"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
        >
          Skip to form
        </a>

        {/* Brand */}
        <header className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-10 lg:left-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 sm:gap-3 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-1"
            aria-label="Go to homepage"
          >
            <Image
              src={heroProps.logoSrc}
              alt="Camella Logo"
              width={32}
              height={32}
              className="rounded-md shadow-sm transition-transform group-hover:scale-105"
              priority
              onError={handleImageError}
            />
            <Image
              src="/camella-logo.svg"
              alt=""
              width={96}
              height={32}
              className="transition-transform group-hover:scale-105"
              priority
              onError={handleImageError}
            />
          </Link>
        </header>

        <div className="w-full max-w-sm space-y-6">
          {/* Title and subtitle */}
          <header className="text-center space-y-2">
            <h1
              id="auth-title"
              className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight"
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-xs mx-auto">
                {subtitle}
              </p>
            )}
          </header>

          {/* Auth form */}
          <div id="auth-form" className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
            {children}
          </div>

          {/* Footer */}
          <footer className="text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ArcaneEchos. Todos los derechos reservados.
            </p>
          </footer>
        </div>
      </div>

      {/* Right column: hero */}
      {showHero && (
        <aside
          className="relative hidden lg:flex items-start justify-center pt-[25vh] xl:pt-[30vh] bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 overflow-hidden"
          aria-hidden="true"
        >
          {/* Background image */}
          {!imageError && (
            <Image
              src={heroProps.imageSrc}
              alt={heroProps.imageAlt}
              fill
              priority
              className="object-cover transition-opacity duration-500"
              onError={handleImageError}
            />
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-indigo-950/50 to-indigo-950/20 z-10" />

          {/* Animated background elements */}
          <div className="absolute inset-0 z-5">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl animate-pulse delay-1000" />
          </div>

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center text-center px-6 sm:px-8 lg:px-10 max-w-2xl animate-in fade-in-50 slide-in-from-top-4 duration-500 delay-200">
            <h2 className="font-kalice text-white text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight drop-shadow-lg leading-tight">
              {heroProps.heading}
            </h2>
            {heroProps.subheading && (
              <p className="mt-4 sm:mt-6 max-w-lg text-base sm:text-lg text-white/90 leading-relaxed drop-shadow-md">
                {heroProps.subheading}
              </p>
            )}

            {/* Decorative element */}
            <div className="mt-8 w-24 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full" />
          </div>
        </aside>
      )}
    </div>
  );
}