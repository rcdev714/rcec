import { fetchCompanyHistory } from "@/lib/data/companies";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompanyProfile from "@/components/company-profile";  // Company Profile Component


interface CompanyDetailProps {
  params: Promise<{ ruc: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}

export default async function CompanyDetail({ params, searchParams }: CompanyDetailProps) {
  const { ruc } = await params;
  const { returnUrl } = await searchParams;

  // Auth check (similar to companies/page.tsx)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const history = await fetchCompanyHistory(ruc);

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-sm">No data found for RUC {ruc}.</p>
      </div>
    );
  }

  // Pass history and returnUrl to the Client Component
  return <CompanyProfile history={history} ruc={ruc} returnUrl={returnUrl} />;
}

export const dynamic = "force-dynamic"; 