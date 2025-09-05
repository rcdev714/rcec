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
