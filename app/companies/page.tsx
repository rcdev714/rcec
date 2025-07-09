import { createClient } from "@/lib/supabase/server";
import { CompaniesUI } from "@/components/companies-ui";
import { Company } from "@/types/company";

export default async function CompaniesPage() {
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from('latest_companies')
    .select('*');

  if (error) {
    console.error("Error fetching companies:", error);
    return <div>Error loading companies. Please try again later.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">UNIBROKERS</h1>
      </div>
      <CompaniesUI companies={companies as Company[]} />
    </div>
  );
}

 