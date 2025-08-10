import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building, Package, MessageSquare } from "lucide-react";
import SubscriptionStatus from "@/components/subscription-status";
import UsageLimits from "@/components/usage-limits";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Bienvenido
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Selecciona una opción para empezar.
          </p>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Actions - Left Column */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Acciones Principales</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/companies" passHref>
                <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg">
                  <Building size={28} />
                  <span>Buscar Empresas</span>
                </Button>
              </Link>
              <Link href="/offerings" passHref>
                <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg">
                  <Package size={28} />
                  <span>Mis Servicios</span>
                </Button>
              </Link>
              <Link href="/chat" passHref>
                <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 text-lg">
                  <MessageSquare size={28} />
                  <span>Assistente</span>
                </Button>
              </Link>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/pricing" passHref>
                  <Button variant="outline" className="w-full justify-start">
                    Ver Planes de Suscripción
                  </Button>
                </Link>
                <Link href="/companies" passHref>
                  <Button variant="outline" className="w-full justify-start">
                    Búsqueda Avanzada
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Subscription Info - Right Column */}
          <div className="space-y-6">
            <SubscriptionStatus />
            <UsageLimits />
          </div>
        </div>
      </div>
    </div>
  );
}
