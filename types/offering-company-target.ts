export interface OfferingCompanyTarget {
  offering_id: string;
  company_id: number; // Assuming company.id is a number as per Supabase schema
  created_at?: string;
}
