import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-300 bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Plataforma B2B impulsada por IA
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Accede a una base de datos de <span className="font-semibold text-foreground">300.000+ empresas</span> y
            <span className="font-semibold text-foreground"> 200.000+ contactos</span> verificados. Nuestro asistente actúa como tu representante de ventas 24/7:
            navega la web, identifica a tus clientes ideales y te ayuda a vender tu producto o servicio.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/companies" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Explorar empresas
            </Link>
            <Link href="/chat" className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-gray-200 transition-colors">
              Hablar con el asistente IA
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6">
            <Card className="border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">300.000+</CardTitle>
                <CardDescription>Empresas</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">200.000+</CardTitle>
                <CardDescription>Contactos verificados</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Rep. de ventas 24/7</CardTitle>
                <CardDescription>Asistente de IA personal</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features - minimalist */}
      <section className="py-16 border-t border-gray-300">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Representante de ventas 24/7</CardTitle>
                <CardDescription>
                  Prospección continua: busca, prioriza y te sugiere a quién contactar, incluso mientras duermes.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos confiables</CardTitle>
                <CardDescription>
                  Empresas y contactos verificados con filtros por industria, tamaño y ubicación.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mensajes y seguimiento</CardTitle>
                <CardDescription>
                  Redacción de mensajes, follow-ups automáticos y registro de conversaciones para cerrar más negocios.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
