"use client";

import { useEffect } from "react";
import { useEnvaultStore } from "@/lib/store";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AuthSync({ user }: { user: User }) {
  const login = useEnvaultStore((state) => state.login);

  useEffect(() => {
    if (!user) return;

    const meta = user.user_metadata || {};

    // If user_metadata already has a username, use it directly
    if (meta.username) {
      login({
        id: user.id,
        firstName:
          meta.first_name ||
          meta.full_name?.split(" ")[0] ||
          user.email?.split("@")[0] ||
          "",
        lastName:
          meta.last_name || meta.full_name?.split(" ").slice(1).join(" ") || "",
        username: meta.username,
        email: user.email!,
        avatar: meta.avatar_url,
        authProviders: user.identities?.map((id) => id.provider) || [],
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      });
      return;
    }

    // Fallback: fetch username from the profiles table (set by trigger/backfill)
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        login({
          id: user.id,
          firstName:
            meta.first_name ||
            meta.full_name?.split(" ")[0] ||
            user.email?.split("@")[0] ||
            "",
          lastName:
            meta.last_name ||
            meta.full_name?.split(" ").slice(1).join(" ") ||
            "",
          username: profile?.username || user.email?.split("@")[0] || "",
          email: user.email!,
          avatar: meta.avatar_url,
          authProviders: user.identities?.map((id) => id.provider) || [],
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
        });
      });
  }, [user, login]);

  return null;
}
