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
}
