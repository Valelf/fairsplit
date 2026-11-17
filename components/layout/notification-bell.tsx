"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeNotifications } from "@/lib/hooks/use-realtime-notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Check,
  Loader2,
  Receipt,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ElementType> = {
  new_bill: Receipt,
  cycle_closed: Clock,
  tenant_invited: UserPlus,
  flag_submitted: AlertTriangle,
  flag_under_review: Eye,
  flag_resolved: CheckCircle,
  flag_dismissed: XCircle,
  bill_adjusted: DollarSign,
};

function getNotificationHref(
  type: string,
  metadata: Record<string, unknown>
): string | null {
  const propertyId = metadata.propertyId as string;
  const cycleId = metadata.cycleId as string;

  switch (type) {
    case "new_bill":
    case "cycle_closed":
      if (propertyId && cycleId) {
        return `/dashboard/tenant/properties/${propertyId}/bills/${cycleId}`;
      }
      return propertyId
        ? `/dashboard/tenant/properties/${propertyId}/bills`
        : null;
    case "tenant_invited":
      return "/dashboard/tenant/properties";
    case "flag_submitted":
      return propertyId
        ? `/dashboard/owner/properties/${propertyId}/flags`
        : null;
    case "flag_under_review":
    case "flag_resolved":
    case "flag_dismissed":
    case "bill_adjusted":
      return propertyId
        ? `/dashboard/tenant/properties/${propertyId}/bills`
        : null;
    default:
      return null;
  }
}

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    getUser();
  }, []);

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useRealtimeNotifications(userId);

  function handleNotificationClick(notification: {
    id: string;
    type: string;
    is_read: boolean;
    metadata: Record<string, unknown>;
  }) {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const href = getNotificationHref(notification.type, notification.metadata);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                const href = getNotificationHref(
                  notification.type,
                  notification.metadata
                );

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      !notification.is_read ? "bg-accent/50" : ""
                    } ${href ? "cursor-pointer hover:bg-accent/30" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                    role={href ? "button" : undefined}
                    tabIndex={href ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (href && (e.key === "Enter" || e.key === " ")) {
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
