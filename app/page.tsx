import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Top left logo */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Link href="/" className="inline-block">
          <Image
            src="/image.png"
            alt="UNIBROKERS Logo"
            width={200}
            height={60}
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* Main Content - Better distributed */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - Description */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-2xl font-semibold text-gray-600 leading-relaxed">
                Sistema de filtrado de base de datos avanzada de empresas.
              </p>
            </div>
            
            <Link
              href="/companies"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground text-lg font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              Explorar empresas →
            </Link>
          </div>

          {/* Right Column - Features */}
          <div className="space-y-6">
            <h3 className="text-2xl font-medium text-foreground">
              Qué puedes hacer
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-lg text-muted-foreground">
                  Buscar empresas por RUC, nombre o provincia
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-lg text-muted-foreground">
                  Filtrar por métricas financieras como activos, patrimonio y utilidades
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-lg text-muted-foreground">
                  Analizar datos por año fiscal y número de empleados
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-lg text-muted-foreground">
                  Exportar resultados para análisis adicional
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
