"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowLeft } from "lucide-react";
import FollowButton from "@/components/follow-button";

interface BasicProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  position: string | null;
  company_name: string | null;
  is_public_profile: boolean;
}

export default function LimitedProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<BasicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchBasicProfile();
    checkFollowStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchBasicProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${userId}/basic`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        // If API fails, set a minimal profile object
        setProfile({
          user_id: userId,
          display_name: null,
          first_name: "Usuario",
          last_name: "Privado",
          avatar_url: null,
          position: null,
          company_name: null,
          is_public_profile: false,
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      // Set fallback
      setProfile({
        user_id: userId,
        display_name: null,
        first_name: "Usuario",
        last_name: "Privado",
        avatar_url: null,
        position: null,
        company_name: null,
        is_public_profile: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/follows?user_id=${userId}&type=followers`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.stats?.is_following || false);
      }
    } catch (err) {
      console.error("Error checking follow status:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Perfil no encontrado</h1>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name ||
    (profile.first_name || profile.last_name
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "Usuario");

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <Card>
            <CardContent className="pt-8">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center text-2xl font-semibold">
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

                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h1 className="text-2xl font-semibold">{displayName}</h1>
                    {!profile.is_public_profile && (
                      <Badge className="bg-gray-200 text-gray-800 border-gray-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Privado
                      </Badge>
                    )}
                  </div>
                  
                  {profile.position && (
                    <p className="text-gray-600 text-sm">
                      {profile.position}
                      {profile.company_name ? ` · ${profile.company_name}` : ""}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium text-sm text-gray-900 mb-1">
                        Este perfil es privado
                      </p>
                      <p className="text-xs text-gray-600 mb-3">
                        Envía una solicitud de seguimiento para ver las publicaciones y más información de este usuario.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-300 rounded p-2 text-xs text-gray-700">
                        💡 <strong>Nota:</strong> Para habilitar todas las funciones de privacidad, aplica la migración:
                        <code className="block mt-1 text-xs bg-white p-1 rounded">
                          migrations/add_privacy_and_notifications.sql
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <FollowButton
                    userId={userId}
                    initialIsFollowing={isFollowing}
                    isPrivateProfile={!profile.is_public_profile}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

