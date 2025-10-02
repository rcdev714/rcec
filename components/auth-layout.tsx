import Link from "next/link";
import Image from "next/image";

interface AuthHeroProps {
  heading?: string;
  subheading?: string;
  imageSrc?: string;
  logoSrc?: string;
}

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  hero?: AuthHeroProps;
}

export function AuthLayout({ children, title, hero }: AuthLayoutProps) {
  const heroHeading =
    hero?.heading ?? "Encuentra y conecta con empresas, rápido.";
  const heroSubheading =
    hero?.subheading ?? "";
  const heroImageSrc = hero?.imageSrc ?? "/heroImage.jpg";
  const heroLogoSrc = hero?.logoSrc ?? "/logo.png";

  return (
    <div className="min-h-screen bg-background grid md:grid-cols-2">
      {/* Left column: form */}
      <div className="relative flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
        {/* Brand */}
        <div className="absolute top-6 left-6 md:top-10 md:left-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Image
              src={heroLogoSrc}
              alt="Camella Logo"
              width={40}
              height={40}
              className="rounded-md shadow-sm"
              priority
            />
            <span className="font-kalice text-3xl font-medium text-foreground tracking-tight group-hover:text-primary transition-colors">
              Camella
            </span>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          {/* Title and subtitle */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
          </div>

          {/* Auth form */}
          {children}

          {/* Footer */}
          <div className="mt-8 text-left">
            <p className="text-xs text-muted-foreground">
              © 2025 ArcaneEchos. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Right column: hero */}
      <div className="relative hidden md:flex items-start justify-center pt-[33.33vh] bg-indigo-950 overflow-hidden">
        {/* Background image */}
        <Image
          src={heroImageSrc}
          alt="Hero"
          fill
          priority
          className="object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/70 via-indigo-950/40 to-transparent z-20" />

        {/* Content */}
        <div className="relative z-30 flex flex-col items-center text-center px-10">
          <Image
            src={heroLogoSrc}
            alt="Logo"
            width={80}
            height={80}
            className="mb-8 opacity-90"
          />
          <h2 className="font-kalice text-white text-3xl font-medium tracking-tight drop-shadow-md md:text-4xl">
            {heroHeading}
          </h2>
          {heroSubheading ? (
            <p className="mt-4 max-w-lg text-base text-white/80">
              {heroSubheading}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}