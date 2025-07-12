import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/components/auth-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/animated-counter";
import { fetchTotalCompanyCount } from "@/lib/data/companies";

export default async function Home() {
  // Get the real company count from the database
  const totalCompanyCount = await fetchTotalCompanyCount();
  
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
      {/* Header */}
      <header className="border-b border-gray-300 bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
        </div>
      </header>

      {/* Hero Section - Replit Style */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight">
                  Base de Datos para{" "}
                  <span className="text-primary">Análisis Empresarial</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                  Sistema avanzado de busqueda y filtrado de empresas para el analisis de datos financieros.
                </p>
              </div>
              
              {/* Animated Counter Feature */}
              <div className="bg-white border border-gray-300 rounded-2xl p-6 max-w-md shadow-lg">
                <div className="text-center space-y-2">
                  <div className="text-5xl md:text-6xl font-bold text-black">
                    <AnimatedCounter targetNumber={totalCompanyCount} className="font-bold text-black" />
                  </div>
                  <div className="text-lg font-semibold text-black">
                    Empresas disponibles
                  </div>
                  <div className="text-sm text-gray-600">
                    Base de datos actualizada en tiempo real
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/companies"
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Explorar Empresas →
                </Link>
                <button className="inline-flex items-center justify-center px-8 py-4 border border-border text-foreground text-lg font-semibold rounded-lg hover:bg-muted/50 transition-colors">
                  Ver Demo
                </button>
              </div>
            </div>

            {/* Right side - Hero Image Space */}
            <div className="relative">
              <div className="relative z-10">
                {/* Hero Image */}
                <div className="rounded-2xl overflow-hidden shadow-xl aspect-[3/2] bg-muted/10 max-w-lg mx-auto lg:max-w-none">
                  <Image
                    src="/HeroImageRC.jpg"
                    alt="Hero Analysis Image"
                    width={800}
                    height={533}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 500px"
                    priority
                    quality={90}
                  />
                </div>
              </div>
              
              {/* Floating cards for visual interest */}
             
              
              <div className="absolute bottom-4 -right-4 z-20 bg-card border border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-700 text-base font-semibold">F</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">Filtros Avanzados</div>
                    <div className="text-sm text-muted-foreground">50+ métricas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-gray-300">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              Sistema de Analisis Financiero
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

     

      
    </div>
  );
}
