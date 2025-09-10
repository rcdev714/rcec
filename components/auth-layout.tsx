import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="inline-block">
          </Link>
        </div>
        
        {/* Title and subtitle */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {subtitle}
          </p>
        </div>
        
        {/* Auth form */}
        <div className="w-full max-w-sm">
          {children}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 UNIBROKERS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
} 