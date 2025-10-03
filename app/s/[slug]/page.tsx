import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/staticClient";
import { AuthButton } from "@/components/auth-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import PublicViewTracker from "@/components/public-view-tracker";
import { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const supabase = createStaticClient();
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

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data: offerings } = await supabase
    .from('user_offerings')
    .select('public_slug')
    .eq('is_public', true)
    .is('public_revoked_at', null)
    .limit(100); // Pre-build the first 100 public offerings

  type OfferingSlug = { public_slug: string };
  const typedOfferings: OfferingSlug[] | null = offerings;

  return typedOfferings?.map(({ public_slug }) => ({
    slug: public_slug,
  })) || [];
}

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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
        <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">Camella</Link>
            <AuthButton />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-20">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl">Enlace no disponible</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Este contenido no está disponible. Es posible que el enlace haya sido desactivado por el propietario o sea incorrecto.</p>
            </CardContent>
          </Card>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold">Camella</Link>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card className="relative overflow-hidden border-gray-200 shadow-sm">
          {/* Client-side view tracker */}
          <PublicViewTracker offeringId={offering.id} />
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-100 blur-3xl opacity-50" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl tracking-tight">{offering.offering_name}</CardTitle>
                {offering.industry && <Badge variant="secondary" className="w-fit mt-2">{offering.industry}</Badge>}
              </div>
              {website && (
                <Link href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm hover:bg-gray-50">
                  Visitar sitio
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Hero info band */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-gray-500">Precio</div>
                <div className="text-lg font-semibold text-green-700 mt-1">{priceDisplay || 'Consultar'}</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-gray-500">Empresa</div>
                <div className="text-sm mt-1">{offering.public_company_name || '—'}</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-gray-500">Contacto</div>
                <div className="text-sm mt-1">{offering.public_contact_name || '—'}</div>
              </div>
            </div>

            {/* Contact & company */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                {offering.public_company_name && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Empresa: </span>{offering.public_company_name}
                  </div>
                )}
                {offering.public_contact_name && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Contacto: </span>{offering.public_contact_name}
                  </div>
                )}
                {offering.public_contact_email && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Email: </span>
                    <a className="text-blue-600 hover:underline" href={`mailto:${offering.public_contact_email}`}>{offering.public_contact_email}</a>
                  </div>
                )}
                {offering.public_contact_phone && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Teléfono: </span>
                    <a className="text-blue-600 hover:underline" href={`tel:${offering.public_contact_phone}`}>{offering.public_contact_phone}</a>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {website && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Sitio web: </span>
                    <a className="text-blue-600 hover:underline" href={website} target="_blank" rel="noopener noreferrer">{website}</a>
                  </div>
                )}
                {Array.isArray(offering.social_media_links) && offering.social_media_links.length > 0 && (
                  <div className="text-sm text-gray-700">
                    <span className="text-sm font-medium">Redes sociales: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {offering.social_media_links.map((s, idx) => (
                        <a key={idx} className="text-blue-600 hover:underline" href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.platform || s.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {offering.description && (
              <div>
                <h2 className="text-lg font-medium mb-1">Descripción</h2>
                <p className="text-gray-700 leading-relaxed">{offering.description}</p>
              </div>
            )}

            {/* Industry targets */}
            {Array.isArray(offering.industry_targets) && offering.industry_targets.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-2">Industrias objetivo</h2>
                <div className="flex flex-wrap gap-2">
                  {offering.industry_targets.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation */}
            {Array.isArray(offering.documentation_urls) && offering.documentation_urls.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-2">Documentación</h2>
                <ul className="list-disc pl-6 space-y-1">
                  {offering.documentation_urls.map((d, idx) => (
                    <li key={idx} className="text-sm">
                      <a className="text-blue-600 hover:underline" href={d.url} target="_blank" rel="noopener noreferrer">
                        {d.description || d.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


