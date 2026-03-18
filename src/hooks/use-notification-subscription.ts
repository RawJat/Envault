"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { Notification } from "@/lib/types/notifications";
import { toast } from "sonner";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useNotificationSubscription() {
  // Capture stable refs to store methods to avoid re-running the effect
  // when Zustand creates new function references on re-render
  const storeRef = useRef(useNotificationStore.getState());

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isActive = false;
    let debounceTimer: NodeJS.Timeout;
    let isStale = false;

    const handleRealtimeEvent = (payload: unknown) => {
      const dbPayload = payload as RealtimePostgresChangesPayload<
        Record<string, unknown>
      >;
      const { addNotification, updateNotification, removeNotification } =
        useNotificationStore.getState();

      if (dbPayload.eventType === "INSERT") {
        const notification = dbPayload.new as unknown as Notification;
        addNotification(notification);
        toast.info(notification.title, {
          description: notification.message,
          action: notification.action_url
            ? {
                label: "View",
                onClick: () => {
                  window.location.href = notification.action_url!;
                },
              }
            : undefined,
        });
      } else if (dbPayload.eventType === "UPDATE") {
        updateNotification(dbPayload.new as unknown as Notification);
      } else if (dbPayload.eventType === "DELETE") {
        removeNotification((dbPayload.old as unknown as Notification).id);
      }

      if (!document.hasFocus()) {
        isStale = true;
      }
    };

    const connectRealtime = async () => {
      if (channel || isActive) return;
      isActive = true;

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isActive) return;

        if (userError || !user) {
          if (userError)
            console.error(
              "Failed to get user for notification subscription:",
              userError,
            );
          return;
        }

        channel = supabase
          .channel(`notifications:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            handleRealtimeEvent,
          )
          .subscribe((status, err) => {
            if (err) console.error("Notification subscription error:", err);
          });
      } catch (error) {
        console.error("Error setting up notification subscription:", error);
      }
    };

    const disconnectRealtime = () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const handleFocus = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isStale) {
          storeRef.current.fetchNotifications();
          isStale = false;
        }
      }, 300);
    };

    connectRealtime();

    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("focus", handleFocus);
      disconnectRealtime();
    };
  }, []);
}
