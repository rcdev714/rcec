import { createClient } from '@/lib/supabase/server';
import StripePricingTable from '@/components/stripe-pricing-table';

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const upgradeRequired = resolvedSearchParams.upgrade === 'required';

  // Get authenticated user to pre-fill email
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Elige tu Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Selecciona el plan perfecto para las necesidades de tu negocio
          </p>
          {upgradeRequired && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800">
                Necesitas actualizar tu plan para acceder a esta función.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-12 flex justify-center">
          <StripePricingTable customerEmail={user?.email} />
        </div>
      </div>
    </div>
  );
}
