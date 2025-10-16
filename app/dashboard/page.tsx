import SubscriptionStatus from "@/components/subscription-status";
import PlanCard from "@/components/dashboard/plan-card";
import AnalyticsCard from "@/components/dashboard/analytics-card";
import Link from "next/link";
import { FileText, Sparkles, Building, Package, CheckCircle } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sessionId = resolvedSearchParams.session_id;
  
  // Show success message if redirected from successful checkout
  const showSuccessMessage = !!sessionId;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Success Message Banner */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-900">
                ¡Suscripción activada exitosamente!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Tu plan ha sido actualizado. Ya puedes disfrutar de todas las funciones premium.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-end justify-between mb-4">
          <div className="text-left">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-xs text-gray-600">
              Monitorea tu uso mensual de búsquedas, conversaciones Agentes y exportaciones. Gestiona tu suscripción y analiza tu actividad.
            </p>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Plan + Analytics */}
          <div className="space-y-6 lg:col-span-2">
            <PlanCard />
            <AnalyticsCard />
            
            
          </div>
          
          {/* Right: Subscription */}
          <div className="space-y-6">
            <SubscriptionStatus />
          </div>
        </div>

        {/* Bottom quick links */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/docs" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50">
            <FileText size={18} />
            <span className="text-xs">Docs</span>
          </Link>
          <Link href="/chat" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50">
            <Sparkles size={18} />
            <span className="text-xs">AI</span>
          </Link>
          <Link href="/companies" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50">
            <Building size={18} />
            <span className="text-xs">Empresas</span>
          </Link>
          <Link href="/offerings" className="flex items-center justify-center gap-2 rounded border border-gray-200 py-3 hover:bg-gray-50">
            <Package size={18} />
            <span className="text-xs">Servicios</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
