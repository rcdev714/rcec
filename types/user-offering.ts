export interface SocialMediaLink {
  platform: string;
  url: string;
}

export interface DocumentationUrl {
  url: string;
  description?: string;
}

export interface UserOffering {
  id?: string; // UUID from Supabase
  user_id: string;
  offering_name: string;
  description?: string;
  industry?: string;
  price_plans?: any; // Consider a more specific type if structure is known
  industry_targets?: string[];
  website_url?: string;
  social_media_links?: SocialMediaLink[];
  documentation_urls?: DocumentationUrl[];
  created_at?: string;
  updated_at?: string;
  // Public sharing fields
  is_public?: boolean;
  public_slug?: string | null;
  public_revoked_at?: string | null;
  public_contact_name?: string | null;
  public_contact_email?: string | null;
  public_contact_phone?: string | null;
  public_company_name?: string | null;
  // Payment type captured in DB with constraint
  payment_type?: 'one-time' | 'subscription' | null;
}
