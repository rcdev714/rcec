import { fetchCompanyHistory } from "@/lib/data/companies";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompanyProfile from "@/components/company-profile";  // Company Profile Component


interface CompanyDetailProps {
  params: Promise<{ ruc: string }>;
}

export default async function CompanyDetail({ params }: CompanyDetailProps) {
  const { ruc } = await params;

  // Auth check (similar to companies/page.tsx)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const history = await fetchCompanyHistory(ruc);

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p>No data found for RUC {ruc}.</p>
      </div>
    );
  }

  // Pass history to the Client Component
  return <CompanyProfile history={history} ruc={ruc} />;
}

export const dynamic = "force-dynamic"; 