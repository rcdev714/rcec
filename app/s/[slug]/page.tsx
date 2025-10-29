import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import PublicViewTracker from "@/components/public-view-tracker";
import { Metadata, ResolvingMetadata } from "next";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const supabase = await createClient();
  const { slug } = await params;

  const { data: offering } = await supabase
    .from("user_offerings")
    .select("offering_name, description, public_company_name")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .is("public_revoked_at", null)
    .single();

  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  // Ensure no double protocol and normalize the URL
  const defaultUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
    ? baseUrl
    : `https://${baseUrl}`;

  if (!offering) {
    return {
      title: "Oferta no encontrada",
    };
  }

  const title = `${offering.offering_name} por ${offering.public_company_name || 'Empresa'}`;
  const description = offering.description?.substring(0, 160) || "Información detallada sobre esta oferta.";

  return {
    title: title,
    description: description,
    alternates: {
      canonical: `${defaultUrl}/s/${slug}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `${defaultUrl}/s/${slug}`,
      images: [
        {
          url: '/logo-image.png', // Replace with dynamic image if available
          width: 500,
          height: 500,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [`${defaultUrl}/logo.png`], // Replace with dynamic image if available
    },
  };
}

export const revalidate = 3600; // Revalidate every hour

type PricePlan = { name?: string; price?: number | string; period?: string };

type PublicOffering = {
  id: string;
  offering_name: string;
  description?: string | null;
  industry?: string | null;
  industry_targets?: string[] | null;
  website_url?: string | null;
  social_media_links?: { platform?: string; url: string }[] | null;
  documentation_urls?: { url: string; description?: string }[] | null;
  payment_type?: "one-time" | "subscription" | null;
  price_plans?: PricePlan[] | null;
  public_contact_name?: string | null;
  public_contact_email?: string | null;
  public_contact_phone?: string | null;
  public_company_name?: string | null;
};

function toNumber(value: number | string | undefined | null): number | null {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

export default async function PublicOfferingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: offering, error: fetchError } = await supabase
    .from("user_offerings")
    .select(
      "id, offering_name, description, industry, industry_targets, website_url, social_media_links, documentation_urls, payment_type, price_plans, public_contact_name, public_contact_email, public_contact_phone, public_company_name"
    )
    .eq("public_slug", slug)
    .eq("is_public", true)
    .is("public_revoked_at", null)
    .single<PublicOffering>();
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Public offering query:', { slug, offering, error: fetchError });
  }

  if (!offering) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <header className="w-full border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-gray-900">Camella</Link>
            <AuthButton />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-20">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enlace no disponible</h2>
            <p className="text-sm text-gray-600">
              Este contenido no está disponible. Es posible que el enlace haya sido desactivado por el propietario o sea incorrecto.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Structured data JSON-LD (computed after data fetch)
  const numericPrices: number[] = (offering.price_plans || [])
    .map((pl: PricePlan) => toNumber(pl.price))
    .filter((n: number | null): n is number => n !== null);
  const lowPrice = numericPrices.length ? Math.min(...numericPrices) : undefined;
  const highPrice = numericPrices.length ? Math.max(...numericPrices) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: offering.offering_name,
    description: offering.description,
    brand: {
      "@type": "Organization",
      name: offering.public_company_name,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: lowPrice ?? undefined,
      highPrice: highPrice ?? undefined,
      offerCount: (offering.price_plans?.length ?? 0),
    },
  };

  // Simple price display
  const priceDisplay = (() => {
    const paymentType = offering.payment_type;
    const plans = offering.price_plans;
    if (!plans || plans.length === 0) return null;
    if (paymentType === "one-time" && plans.length === 1) {
      const p = plans[0];
      const price = toNumber(p.price);
      if (price === null) return null;
      return `$${price}`;
    }
    if (plans.length === 1) {
      const p = plans[0];
      const price = toNumber(p.price);
      const period = p.period || "mes";
      if (price === null) return null;
      return `$${price}/${period}`;
    }
    const valid = plans
      .map((pl) => ({ ...pl, _price: toNumber(pl.price) }))
      .filter((pl) => pl._price !== null) as (PricePlan & { _price: number })[];
    if (valid.length === 0) return null;
    const cheapest = valid.reduce((min, pl) => (pl._price < min._price ? pl : min));
    const price = cheapest._price;
    const period = cheapest.period || "mes";
    return `Desde $${price}/${period}`;
  })();

  const website = offering.website_url
    ? offering.website_url.startsWith("http")
      ? offering.website_url
      : `https://${offering.website_url}`
    : null;

  return (
    <div className="min-h-screen bg-white">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">Camella</Link>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Client-side view tracker */}
        <PublicViewTracker offeringId={offering.id} />
        
        {/* Breadcrumb */}
        <div className="mb-4 text-sm text-gray-600">
          <span>Productos</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{offering.offering_name}</span>
        </div>

        {/* Product Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#635BFF] to-[#5548E6] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-lg">
                  {offering.offering_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{offering.offering_name}</h1>
                {offering.industry && (
                  <Badge variant="outline" className="mt-2">{offering.industry}</Badge>
                )}
              </div>
            </div>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Visitar sitio
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Product Content */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Pricing Section */}
          {priceDisplay && (
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="text-xs text-gray-500 mb-1">Precio</div>
              <div className="text-xl font-semibold text-gray-900">{priceDisplay}</div>
              <div className="text-sm text-gray-500 mt-1">USD</div>
            </div>
          )}

          {/* Description */}
          {offering.description && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Descripción</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{offering.description}</p>
            </div>
          )}

          {/* Contact Information */}
          {(offering.public_company_name || offering.public_contact_name || offering.public_contact_email || offering.public_contact_phone) && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Información de contacto</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {offering.public_company_name && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Empresa</div>
                    <div className="text-sm text-gray-900">{offering.public_company_name}</div>
                  </div>
                )}
                {offering.public_contact_name && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Contacto</div>
                    <div className="text-sm text-gray-900">{offering.public_contact_name}</div>
                  </div>
                )}
                {offering.public_contact_email && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Email</div>
                    <a
                      href={`mailto:${offering.public_contact_email}`}
                      className="text-sm text-[#635BFF] hover:underline"
                    >
                      {offering.public_contact_email}
                    </a>
                  </div>
                )}
                {offering.public_contact_phone && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Teléfono</div>
                    <a
                      href={`tel:${offering.public_contact_phone}`}
                      className="text-sm text-[#635BFF] hover:underline"
                    >
                      {offering.public_contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Links Section */}
          {(website || (Array.isArray(offering.social_media_links) && offering.social_media_links.length > 0)) && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Enlaces</h2>
              <div className="space-y-2">
                {website && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 w-20">Sitio web:</div>
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#635BFF] hover:underline"
                    >
                      {website}
                    </a>
                  </div>
                )}
                {Array.isArray(offering.social_media_links) && offering.social_media_links.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 w-20">Redes sociales:</div>
                    <div className="flex flex-wrap gap-2">
                      {offering.social_media_links.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#635BFF] hover:underline"
                        >
                          {s.platform || s.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Industry Targets */}
          {Array.isArray(offering.industry_targets) && offering.industry_targets.length > 0 && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Dirigido a</h2>
              <div className="flex flex-wrap gap-2">
                {offering.industry_targets.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Documentation */}
          {Array.isArray(offering.documentation_urls) && offering.documentation_urls.length > 0 && (
            <div className="px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Documentación</h2>
              <div className="space-y-2">
                {offering.documentation_urls.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#635BFF] hover:underline"
                    >
                      {d.description || d.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


