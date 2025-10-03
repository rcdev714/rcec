import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

type OfferingSitemapEntry = {
  public_slug: string;
  updated_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  // Ensure no double protocol and normalize the URL
  const defaultUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
    ? baseUrl
    : `https://${baseUrl}`;
  
  const supabase = await createClient();

  // Fetch dynamic public offering slugs
  const { data: offerings, error } = await supabase
    .from('user_offerings')
    .select('public_slug, updated_at')
    .eq('is_public', true)
    .is('public_revoked_at', null);

  if (error) {
    console.error('Error fetching slugs for sitemap:', error);
    // Fallback to only static pages if Supabase fetch fails
  }

  const dynamicLinks: MetadataRoute.Sitemap = offerings?.map((offering: OfferingSitemapEntry) => ({
    url: `${defaultUrl}/s/${offering.public_slug}`,
    lastModified: offering.updated_at ? new Date(offering.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  })) || [];

  const staticLinks: MetadataRoute.Sitemap = [
    {
      url: defaultUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${defaultUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${defaultUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${defaultUrl}/companies`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  return [...staticLinks, ...dynamicLinks];
}
