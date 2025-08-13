import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building, Package, MessageSquare } from "lucide-react";
import SubscriptionStatus from "@/components/subscription-status";
import PlanCard from "@/components/dashboard/plan-card";
import AnalyticsCard from "@/components/dashboard/analytics-card";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-left mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Bienvenido
          </h1>
          <p className="mt-1 text-sm text-gray-500">Resumen de tu plan y uso</p>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Plan + Analytics */}
          <div className="space-y-6 lg:col-span-2">
            <PlanCard />
            <AnalyticsCard />
            <h2 className="text-lg font-semibold">Acciones Principales</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/companies" passHref>
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 text-sm border-gray-300">
                  <Building size={28} />
                  <span>Buscar Empresas</span>
                </Button>
              </Link>
              <Link href="/offerings" passHref>
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 text-sm border-gray-300">
                  <Package size={28} />
                  <span>Mis Servicios</span>
                </Button>
              </Link>
              <Link href="/chat" passHref>
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 text-sm border-gray-300">
                  <MessageSquare size={28} />
                  <span>Assistente</span>
                </Button>
              </Link>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/pricing" passHref>
                  <Button variant="outline" className="w-full justify-start border-gray-300">
                    Ver Planes de Suscripción
                  </Button>
                </Link>
                <Link href="/companies" passHref>
                  <Button variant="outline" className="w-full justify-start border-gray-300">
                    Búsqueda Avanzada
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Right: Subscription */}
          <div className="space-y-6">
            <SubscriptionStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
