import { SupabaseClient } from "@supabase/supabase-js";
import { cacheGet, cacheSet, CacheKeys, CACHE_TTL } from "@/lib/cache";

export const DEFAULT_ENVIRONMENT_SLUG = "development";

export interface ProjectEnvironment {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
}

export async function getProjectEnvironments(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectEnvironment[]> {
  const cacheKey = CacheKeys.projectEnvironments(projectId);
  const cached = await cacheGet<ProjectEnvironment[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const { data, error } = await supabase
    .from("project_environments")
    .select("id, slug, name, is_default")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const environments = (data || []) as ProjectEnvironment[];
  await cacheSet(cacheKey, environments, CACHE_TTL.PROJECT_ENVIRONMENTS);
  return environments;
}

export async function resolveProjectEnvironment(
  supabase: SupabaseClient,
  projectId: string,
  requestedEnvironment?: string | null,
): Promise<{ environment: ProjectEnvironment; usedDefault: boolean }> {
  const environments = await getProjectEnvironments(supabase, projectId);
  if (environments.length === 0) {
    throw new Error("No environments configured for project");
  }

  const normalized = (requestedEnvironment || "").trim().toLowerCase();
  if (normalized) {
    const matched = environments.find((env) => env.slug === normalized);
    if (!matched) {
      throw new Error(
        `Environment '${normalized}' does not exist for this project`,
      );
    }
    return { environment: matched, usedDefault: false };
  }

  const defaultEnv =
    environments.find((env) => env.is_default) ||
    environments.find((env) => env.slug === DEFAULT_ENVIRONMENT_SLUG) ||
    environments[0];

  return { environment: defaultEnv, usedDefault: true };
}
