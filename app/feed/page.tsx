import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FeedClient from "@/components/feed-client";
import SuggestedUsers from "@/components/suggested-users";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user profile for the composer
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, first_name, last_name, avatar_url")
    .eq("user_id", user.id)
    .single();

  const displayName = profile?.display_name ||
    (profile?.first_name || profile?.last_name
      ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
      : user.email) || "Usuario";

  const avatarUrl = profile?.avatar_url;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Feed</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Feed */}
            <div className="lg:col-span-2">
              <FeedClient 
                userId={user.id}
                displayName={displayName}
                avatarUrl={avatarUrl}
                userProfile={{
                  display_name: profile?.display_name,
                  first_name: profile?.first_name,
                  last_name: profile?.last_name,
                  avatar_url: profile?.avatar_url,
                }}
              />
            </div>
            
            {/* Suggested Users Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <SuggestedUsers />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

