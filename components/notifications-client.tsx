"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationWithDetails, FollowRequestWithProfile } from "@/types/social";
import Link from "next/link";
import { Heart, MessageCircle, UserPlus, Check, X, Loader2, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchFollowRequests();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowRequests = async () => {
    try {
      const response = await fetch("/api/follow-requests?type=received");
      if (response.ok) {
        const data = await response.json();
        setFollowRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching follow requests:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleFollowRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch("/api/follow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
        }),
      });

      if (response.ok) {
        // Remove from pending requests
        setFollowRequests(followRequests.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error("Error handling request:", err);
    }
  };

  const getNotificationMessage = (notification: NotificationWithDetails) => {
    const actorName = notification.actor?.display_name ||
      (notification.actor?.first_name || notification.actor?.last_name
        ? `${notification.actor?.first_name ?? ""} ${notification.actor?.last_name ?? ""}`.trim()
        : "Alguien");

    switch (notification.type) {
      case 'follow':
        return `${actorName} comenzó a seguirte`;
      case 'follow_request':
        return `${actorName} solicitó seguirte`;
      case 'follow_accepted':
        return `${actorName} aceptó tu solicitud`;
      case 'like':
        return `${actorName} le gustó tu publicación`;
      case 'comment':
        return `${actorName} comentó en tu publicación`;
      case 'mention':
        return `${actorName} te mencionó`;
      default:
        return "Nueva notificación";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
      case 'follow_request':
      case 'follow_accepted':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'like':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const avatarLetter = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="mr-2">
                {unreadCount}
              </Badge>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Follow Requests */}
      {followRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solicitudes de seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {followRequests.map((request) => {
              const requesterName = request.requester?.display_name ||
                (request.requester?.first_name || request.requester?.last_name
                  ? `${request.requester?.first_name ?? ""} ${request.requester?.last_name ?? ""}`.trim()
                  : "Usuario");
              const requesterAvatar = avatarLetter(requesterName);

              return (
                <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${request.requester_id}`}>
                      <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold cursor-pointer hover:opacity-80">
                        {request.requester?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={request.requester.avatar_url}
                            alt={requesterName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          requesterAvatar
                        )}
                      </div>
                    </Link>
                    <div>
                      <Link href={`/profile/${request.requester_id}`}>
                        <p className="font-semibold hover:underline">{requesterName}</p>
                      </Link>
                      {request.requester?.position && (
                        <p className="text-xs text-gray-600">
                          {request.requester.position}
                          {request.requester.company_name ? ` · ${request.requester.company_name}` : ""}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleFollowRequest(request.id, 'accept')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFollowRequest(request.id, 'decline')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const actorName = notification.actor?.display_name ||
                  (notification.actor?.first_name || notification.actor?.last_name
                    ? `${notification.actor?.first_name ?? ""} ${notification.actor?.last_name ?? ""}`.trim()
                    : "Alguien");
                const actorAvatar = avatarLetter(actorName);

                return (
                  <Link
                    key={notification.id}
                    href={
                      notification.post_id
                        ? `/feed#post-${notification.post_id}`
                        : notification.actor_id
                        ? `/profile/${notification.actor_id}`
                        : "/notifications"
                    }
                  >
                    <div
                      className={`flex items-start gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? "bg-blue-50 border border-blue-200" : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                      {notification.actor_id && (
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold flex-shrink-0">
                          {notification.actor?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={notification.actor.avatar_url}
                              alt={actorName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            actorAvatar
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {getNotificationMessage(notification)}
                        </p>
                        {notification.post?.content && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            &quot;{notification.post.content}&quot;
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

