import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StripePricingTable from '@/components/stripe-pricing-table';
import { getDefaultUrl } from '@/lib/base-url';

const defaultUrl = getDefaultUrl();
const pageUrl = `${defaultUrl}/pricing`;

export const metadata: Metadata = {
  title: 'Planes y precios de Camella',
  description: 'Compara planes de Camella y obtén acceso a datos B2B y agentes de ventas con IA.',
  openGraph: {
    title: 'Planes Camella para ventas B2B',
    description: 'Elige el plan que potencia a tu equipo comercial en Ecuador.',
    url: pageUrl,
    type: 'website',
    images: [
      {
        url: '/HeroImage.jpeg',
        width: 1200,
        height: 630,
        alt: 'Planes Camella',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Planes y precios Camella',
    description: 'Acceso ilimitado a prospectos y analítica comercial con IA.',
    images: [`${defaultUrl}/HeroImage.jpeg`],
  },
  alternates: {
    canonical: pageUrl,
  },
};

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

  if (!user) {
    redirect('/auth/sign-up');
  }

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
