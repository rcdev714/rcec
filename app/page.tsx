import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/components/auth-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const features = [
    {
      title: "Búsqueda Avanzada",
      description: "Busca empresas por RUC, nombre comercial o provincia de manera rápida y precisa."
    },
    {
      title: "Filtros Financieros",
      description: "Filtra por métricas clave como activos, patrimonio, utilidades y más indicadores financieros."
    },
    {
      title: "Análisis Temporal",
      description: "Analiza datos históricos por año fiscal y evolución del número de empleados."
    },
    {
      title: "Exportación de Datos",
      description: "Exporta resultados filtrados para realizar análisis más detallados en herramientas externas."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Header with logo and auth - consistent with companies page */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <Image
              src="/image.png"
              alt="UNIBROKERS Logo"
              width={120}
              height={36}
              className="h-6 w-auto"
            />
          </Link>
          <AuthButton />
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="space-y-6 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Sistema de Análisis
              <span className="block text-primary">Empresarial Avanzado</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Accede a una base de datos completa de empresas ecuatorianas con herramientas 
              de filtrado y análisis financiero de última generación.
            </p>
          </div>
          
          <Link
            href="/companies"
            className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
          >
            Explorar Empresas →
          </Link>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground tracking-tight mb-4">
              Herramientas Poderosas
            </h2>
            <p className="text-muted-foreground text-lg">
              Todo lo que necesitas para analizar el panorama empresarial ecuatoriano
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-4xl mx-auto py-16 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">1000+</div>
              <div className="text-muted-foreground">Empresas registradas</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-muted-foreground">Métricas disponibles</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-muted-foreground">Acceso disponible</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
