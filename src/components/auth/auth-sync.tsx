"use client";

import { useEffect } from "react";
import { useEnvaultStore } from "@/lib/stores/store";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { inferUsernameFromAuth } from "@/lib/utils/username";

export function AuthSync({ user }: { user: User }) {
  const login = useEnvaultStore((state) => state.login);
  const updateUser = useEnvaultStore((state) => state.updateUser);

  useEffect(() => {
    if (!user) return;

    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const baseUser = {
      id: user.id,
      firstName:
        (typeof meta.first_name === "string" ? meta.first_name : "") ||
        (typeof meta.full_name === "string"
          ? meta.full_name.split(" ")[0]
          : "") ||
        user.email?.split("@")[0] ||
        "",
      lastName:
        (typeof meta.last_name === "string" ? meta.last_name : "") ||
        (typeof meta.full_name === "string"
          ? meta.full_name.split(" ").slice(1).join(" ")
          : "") ||
        "",
      username: inferUsernameFromAuth(user.email, meta),
      email: user.email!,
      avatar:
        (typeof meta.avatar_url === "string" ? meta.avatar_url : "") ||
        undefined,
      authProviders: user.identities?.map((id) => id.provider) || [],
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    };

    // Hydrate immediately so header avatar/name/email are visible without waiting
    // for the profiles table round-trip.
    login(baseUser);

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (cancelled) return;
        if (profile?.username && profile.username !== baseUser.username) {
          updateUser({ username: profile.username });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, login, updateUser]);

  return null;
}
