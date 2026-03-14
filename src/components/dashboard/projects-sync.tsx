"use client";

import { useEffect } from "react";
import { useEnvaultStore } from "@/lib/store";
import { getProjects } from "@/app/project-actions";
import { createClient } from "@/lib/supabase/client";
import { inferUsernameFromAuth } from "@/lib/username";

export function ProjectsSync() {
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      const setLoading = useEnvaultStore.getState().setLoading;
      const setProjects = useEnvaultStore.getState().setProjects;
      const login = useEnvaultStore.getState().login;

      setLoading(true);

      try {
        const supabase = createClient();
        const [userResult, projectResult] = await Promise.all([
          supabase.auth.getUser(),
          getProjects(),
        ]);

        if (controller.signal.aborted) return;

        if (userResult.data.user) {
          const u = userResult.data.user;
          const meta = (u.user_metadata || {}) as Record<string, unknown>;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", u.id)
            .maybeSingle();
          const username =
            profile?.username || inferUsernameFromAuth(u.email, meta);

          if (!controller.signal.aborted) {
            login({
              id: u.id,
              email: u.email!,
              firstName:
                (typeof meta.first_name === "string" ? meta.first_name : "") ||
                (typeof meta.full_name === "string"
                  ? meta.full_name.split(" ")[0]
                  : "") ||
                u.email?.split("@")[0] ||
                "",
              lastName:
                (typeof meta.last_name === "string" ? meta.last_name : "") ||
                (typeof meta.full_name === "string"
                  ? meta.full_name.split(" ").slice(1).join(" ")
                  : "") ||
                "",
              username,
              avatar:
                (typeof meta.avatar_url === "string" ? meta.avatar_url : "") ||
                (typeof meta.picture === "string" ? meta.picture : "") ||
                undefined,
              authProviders:
                u.app_metadata?.providers ||
                u.identities?.map((i) => i.provider) ||
                [],
              app_metadata: u.app_metadata,
              user_metadata: u.user_metadata,
            });
          }
        }

        if (!controller.signal.aborted && projectResult.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProjects(projectResult.data as any);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("[ProjectsSync] loadData error:", error);
      } finally {
        if (!controller.signal.aborted) {
          useEnvaultStore.getState().setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      controller.abort();
    };
  }, []); // Empty deps - runs once on mount

  return null;
}
