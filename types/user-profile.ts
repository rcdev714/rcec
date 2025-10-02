export interface UserProfile {
  id?: string;
  user_id: string;
  user_type?: 'individual' | 'enterprise';
  enterprise_role?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  company_ruc?: string;
  position?: string;
  // Social profile fields
  display_name?: string;
  bio?: string;
  location?: string;
  website_url?: string;
  avatar_url?: string;
  is_public_profile?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings extends UserProfile {
  email: string;
  subscription_plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscription_status?: string;
}
