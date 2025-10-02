import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notFound, redirect } from "next/navigation";
import FeedClient from "@/components/feed-client";
import FollowButton from "@/components/follow-button";
import { Globe, Lock } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // Get the currently authenticated user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Special route: /profile/me redirects to current user's profile
  if (userId === "me") {
    if (!currentUser) {
      redirect("/auth/login");
    }
    redirect(`/profile/${currentUser.id}`);
  }

  // Fetch the profile for the requested userId
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    
    // If profile is blocked by RLS (likely private), redirect to limited view
    if (profileError?.code === 'PGRST116') {
      redirect(`/profile/${userId}/limited`);
    }
    
    // Other errors - user doesn't exist
    notFound();
  }

  // Fetch offerings for this user
  const { data: offerings } = await supabase
    .from("user_offerings")
    .select("id, offering_name, description, is_public, public_slug")
    .eq("user_id", userId)
    .eq("is_public", true) // Only show public offerings for now
    .order("created_at", { ascending: false });

  // Determine if the current user is viewing their own profile
  const isOwnProfile = currentUser?.id === userId;

  // Fetch the current logged-in user's profile (for commenting)
  const { data: currentUserProfileData } = currentUser ? await supabase
    .from("user_profiles")
    .select("display_name, first_name, last_name, avatar_url")
    .eq("user_id", currentUser.id)
    .single() : { data: null };

  // Check if current user follows this profile
  const { data: followData } = currentUser && !isOwnProfile ? await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", currentUser.id)
    .eq("followed_id", userId)
    .single() : { data: null };

  const initialIsFollowing = !!followData;

  const displayName = profile.display_name ||
    (profile.first_name || profile.last_name
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "Usuario");

  const avatarLetter = (displayName || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center font-semibold">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={profile.avatar_url} 
                  alt={displayName} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                avatarLetter
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold">{displayName}</h1>
                {isOwnProfile && (
                  <Badge 
                    variant={profile.is_public_profile ? "default" : "secondary"}
                    className={`flex items-center gap-1 ${
                      profile.is_public_profile 
                        ? "bg-green-100 text-green-800 border-green-300" 
                        : "bg-gray-200 text-gray-800 border-gray-400"
                    }`}
                  >
                    {profile.is_public_profile ? (
                      <>
                        <Globe className="h-3 w-3" />
                        Público
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        Privado
                      </>
                    )}
                  </Badge>
                )}
              </div>
              {profile.position && (
                <p className="text-gray-600 text-sm mt-1">
                  {profile.position}
                  {profile.company_name ? ` · ${profile.company_name}` : ""}
                </p>
              )}
              {profile.bio && (
                <p className="text-gray-700 mt-3">{profile.bio}</p>
              )}
              {(profile.location || profile.website_url) && (
                <div className="flex gap-4 mt-3 text-sm text-gray-600">
                  {profile.location && <span>📍 {profile.location}</span>}
                  {profile.website_url && (
                    <a 
                      href={profile.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      🔗 {new URL(profile.website_url).hostname}
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <Link href="/settings">
                    <Button variant="outline">Editar perfil</Button>
                  </Link>
                  <Link href="/offerings">
                    <Button>Mis servicios</Button>
                  </Link>
                </>
              ) : (
                currentUser && (
                  <FollowButton 
                    userId={userId}
                    initialIsFollowing={initialIsFollowing}
                    isPrivateProfile={!profile.is_public_profile}
                  />
                )
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Activity/Posts */}
            <div className="lg:col-span-2">
              <FeedClient
                userId={currentUser?.id || ""}
                displayName={currentUserProfileData ? (
                  currentUserProfileData.display_name ||
                  (currentUserProfileData.first_name || currentUserProfileData.last_name
                    ? `${currentUserProfileData.first_name ?? ""} ${currentUserProfileData.last_name ?? ""}`.trim()
                    : "Usuario")
                ) : "Usuario"}
                avatarUrl={currentUserProfileData?.avatar_url}
                userProfile={{
                  display_name: currentUserProfileData?.display_name || null,
                  first_name: currentUserProfileData?.first_name || null,
                  last_name: currentUserProfileData?.last_name || null,
                  avatar_url: currentUserProfileData?.avatar_url || null,
                }}
                filterByAuthor={userId}
                showComposer={isOwnProfile}
              />
            </div>

            {/* Right Column: Info & Offerings */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-700">
                  {isOwnProfile && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Correo</span>
                      <span>{currentUser?.email}</span>
                    </div>
                  )}
                  {profile.phone && isOwnProfile && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Teléfono</span>
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {profile.user_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo</span>
                      <span>
                        {profile.user_type === "enterprise" ? "Empresarial" : "Individual"}
                      </span>
                    </div>
                  )}
                  {profile.enterprise_role && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rol</span>
                      <span>{profile.enterprise_role}</span>
                    </div>
                  )}
                  {profile.company_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empresa</span>
                      <span>{profile.company_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Servicios Públicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!offerings?.length && (
                    <p className="text-gray-600 text-sm">
                      {isOwnProfile
                        ? "Aún no tienes servicios publicados."
                        : "No hay servicios disponibles."}
                    </p>
                  )}
                  {offerings?.map((o) => {
                    const href =
                      o.is_public && o.public_slug ? `/s/${o.public_slug}` : `/offerings`;
                    return (
                      <Link key={o.id} href={href} className="block">
                        <div className="p-3 border border-gray-200 rounded hover:bg-gray-50">
                          <div className="font-medium">{o.offering_name}</div>
                          {o.description && (
                            <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                              {o.description}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

