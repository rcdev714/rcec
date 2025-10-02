"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // When visiting notifications page, mark all as read after a short delay
    if (pathname === '/notifications') {
      const timer = setTimeout(() => {
        setUnreadCount(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?unread_only=true");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}

