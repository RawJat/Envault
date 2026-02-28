"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { Notification } from "@/lib/types/notifications";
import { toast } from "sonner";

export function useNotificationSubscription() {
  // Capture stable refs to store methods to avoid re-running the effect
  // when Zustand creates new function references on re-render
  const storeRef = useRef(useNotificationStore.getState());

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const controller = new AbortController();
    const { signal } = controller;

    const setupSubscription = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (signal.aborted) return;

        if (userError || !user) {
          if (userError)
            console.error(
              "Failed to get user for notification subscription:",
              userError,
            );
          return;
        }

        // Initial fetch
        await storeRef.current.fetchNotifications();

        if (signal.aborted) return;

        // Subscribe to real-time changes
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
            (payload) => {
              const {
                addNotification,
                updateNotification,
                removeNotification,
              } = useNotificationStore.getState();

              if (payload.eventType === "INSERT") {
                const notification = payload.new as Notification;
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
              } else if (payload.eventType === "UPDATE") {
                updateNotification(payload.new as Notification);
              } else if (payload.eventType === "DELETE") {
                removeNotification((payload.old as Notification).id);
              }
            },
          )
          .subscribe((status, err) => {
            if (err) console.error("Notification subscription error:", err);
          });
      } catch (error) {
        // Suppress AbortError - it's expected when the component unmounts mid-setup
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Error setting up notification subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      controller.abort();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty deps - runs once on mount, cleans up on unmount
}
