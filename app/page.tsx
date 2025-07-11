import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-semibold text-red-900 tracking-tight">
              UNIBROKERS 
            </h1>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight"></h2>
            <p className="text-xl font-semibold text-gray-600 max-w-2xl">
              Sistema de filtrado de base de datos avanzada de empresas.
              
            </p>
          </div>
          
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">
                Qué puedes hacer
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Buscar empresas por RUC, nombre o provincia</li>
                <li>• Filtrar por métricas financieras como activos, patrimonio y utilidades</li>
                <li>• Analizar datos por año fiscal y número de empleados</li>
                <li>• Exportar resultados para análisis adicional</li>
              </ul>
            </div>
            
            <Link
              href="/companies"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              Explorar empresas →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
