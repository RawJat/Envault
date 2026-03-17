"use client";

import { useEffect } from "react";
import { useEnvaultStore } from "@/lib/stores/store";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { inferUsernameFromAuth } from "@/lib/utils/username";

export function AuthSync({ user }: { user: User }) {
  const login = useEnvaultStore((state) => state.login);

  useEffect(() => {
    if (!user) return;

    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        const username =
          profile?.username || inferUsernameFromAuth(user.email, meta);
        login({
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
          username,
          email: user.email!,
          avatar:
            (typeof meta.avatar_url === "string" ? meta.avatar_url : "") ||
            undefined,
          authProviders: user.identities?.map((id) => id.provider) || [],
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
        });
      });
  }, [user, login]);

  return null;
}
