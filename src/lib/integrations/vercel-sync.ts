import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";

type SyncChange = {
  operation: "upsert" | "delete";
  key: string;
  value?: string;
};

type SyncSummary = {
  syncedLinks: number;
  skippedLinks: number;
  appliedChanges: number;
  errors: string[];
};

const DEFAULT_TARGET_BY_ENV: Record<string, string | null> = {
  development: "development",
  preview: "preview",
  production: "production",
};

type VercelEnvItem = {
  id: string;
  key: string;
  target?: string[];
};

function defaultTargetForEnvironment(environmentSlug: string): string | null {
  return DEFAULT_TARGET_BY_ENV[environmentSlug] ?? null;
}

async function maybeDecryptToken(storedToken: string): Promise<string> {
  if (storedToken.startsWith("v1:")) {
    return decrypt(storedToken);
  }
  return storedToken;
}

async function fetchProjectEnvs(
  accessToken: string,
  vercelProjectId: string,
): Promise<VercelEnvItem[]> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${vercelProjectId}/env`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    envs?: VercelEnvItem[];
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message || "Failed to read Vercel env list";
    throw new Error(message);
  }

  return payload.envs ?? [];
}

async function deleteEnvById(
  accessToken: string,
  vercelProjectId: string,
  envId: string,
): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${envId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(payload.error?.message || "Failed to delete Vercel env");
  }
}

async function patchEnvTargetById(
  accessToken: string,
  vercelProjectId: string,
  envId: string,
  newTargets: string[],
): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${envId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: newTargets }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(payload.error?.message || "Failed to patch Vercel env");
  }
}

async function createEnvValue(
  accessToken: string,
  vercelProjectId: string,
  key: string,
  value: string,
  targets: string[],
): Promise<void> {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${vercelProjectId}/env?upsert=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        target: targets,
        type: "sensitive",
      }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(payload.error?.message || "Failed to create Vercel env");
  }
}

async function resolveTargetsForLink(
  envaultProjectId: string,
  configurationId: string,
  vercelProjectId: string,
  environmentSlug: string,
): Promise<string[]> {
  const fixedTarget = defaultTargetForEnvironment(environmentSlug);
  if (!fixedTarget) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vercel_environment_mappings")
    .select("vercel_target")
    .eq("envault_project_id", envaultProjectId)
    .eq("configuration_id", configurationId)
    .eq("vercel_project_id", vercelProjectId)
    .eq("envault_environment_slug", environmentSlug);

  if (!error && data && data.length > 0) {
    // Advanced-mode UI is fixed 1:1 (Development->development,
    // Preview->preview, Production->production). Old rows may still
    // carry cross-target values, so treat row existence as enabled
    // and force the fixed target to avoid mixed-target conflicts.
    return [fixedTarget];
  }

  // If this link already has explicit mapping rows but none for this
  // environment, treat it as intentionally disabled (checkbox off).
  if (!error) {
    const { data: anyRowsForLink, error: anyRowsError } = await admin
      .from("vercel_environment_mappings")
      .select("id")
      .eq("envault_project_id", envaultProjectId)
      .eq("configuration_id", configurationId)
      .eq("vercel_project_id", vercelProjectId)
      .limit(1);

    if (!anyRowsError && (anyRowsForLink?.length || 0) > 0) {
      return [];
    }
  }

  return [fixedTarget];
}

export async function syncVercelChangesForEnvironment(input: {
  envaultProjectId: string;
  environmentSlug: string;
  changes: SyncChange[];
}): Promise<SyncSummary> {
  const { envaultProjectId, environmentSlug, changes } = input;
  const admin = createAdminClient();

  const { data: links, error: linksError } = await admin
    .from("vercel_project_links")
    .select("vercel_project_id, configuration_id")
    .eq("envault_project_id", envaultProjectId);

  if (linksError) {
    return {
      syncedLinks: 0,
      skippedLinks: 0,
      appliedChanges: 0,
      errors: [linksError.message],
    };
  }

  if (!links || links.length === 0) {
    return { syncedLinks: 0, skippedLinks: 0, appliedChanges: 0, errors: [] };
  }

  const configurationIds = Array.from(
    new Set(links.map((link) => link.configuration_id)),
  );
  const { data: installations, error: installationsError } = await admin
    .from("vercel_installations")
    .select("configuration_id, access_token, status")
    .in("configuration_id", configurationIds)
    .eq("status", "active");

  if (installationsError) {
    return {
      syncedLinks: 0,
      skippedLinks: links.length,
      appliedChanges: 0,
      errors: [installationsError.message],
    };
  }

  const tokenByConfiguration = new Map<string, string>();
  for (const installation of installations ?? []) {
    if (!installation.access_token) continue;
    try {
      const token = await maybeDecryptToken(installation.access_token);
      tokenByConfiguration.set(installation.configuration_id, token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to decrypt token";
      console.error("[Vercel Sync] Failed to decrypt access token", message);
    }
  }

  const summary: SyncSummary = {
    syncedLinks: 0,
    skippedLinks: 0,
    appliedChanges: 0,
    errors: [],
  };

  for (const link of links) {
    const accessToken = tokenByConfiguration.get(link.configuration_id);
    if (!accessToken) {
      summary.skippedLinks += 1;
      continue;
    }

    const targets = await resolveTargetsForLink(
      envaultProjectId,
      link.configuration_id,
      link.vercel_project_id,
      environmentSlug,
    );

    if (targets.length === 0) {
      summary.skippedLinks += 1;
      continue;
    }

    try {
      let envs = await fetchProjectEnvs(accessToken, link.vercel_project_id);

      for (const change of changes) {
        const matching = envs.filter((env) => env.key === change.key);
        
        // Remove our targets from any existing variables with the same key
        for (const env of matching) {
          const currentTargets = env.target ?? [];
          const remainingTargets = currentTargets.filter(
            (t) => !targets.includes(t),
          );

          if (remainingTargets.length === currentTargets.length) {
            continue;
          }

          if (remainingTargets.length === 0) {
            await deleteEnvById(accessToken, link.vercel_project_id, env.id);
          } else {
            await patchEnvTargetById(
              accessToken,
              link.vercel_project_id,
              env.id,
              remainingTargets,
            );
          }
        }
        
        // Remove them from local cache so we don't process them again
        envs = envs.filter((env) => !matching.some((item) => item.id === env.id));

        if (change.operation === "upsert") {
          if (typeof change.value !== "string") {
            throw new Error(
              `Missing plaintext value for upsert key ${change.key}`,
            );
          }

          await createEnvValue(
            accessToken,
            link.vercel_project_id,
            change.key,
            change.value,
            targets,
          );
        }

        summary.appliedChanges += 1;
      }

      summary.syncedLinks += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown sync error while updating Vercel";
      summary.errors.push(
        `Project ${link.vercel_project_id}: ${message}`,
      );
      summary.skippedLinks += 1;
    }
  }

  return summary;
}

export async function syncFullEnvironmentToVercel(input: {
  envaultProjectId: string;
  environmentSlug: string;
}): Promise<SyncSummary> {
  const { envaultProjectId, environmentSlug } = input;
  const admin = createAdminClient();

  const { data: environment, error: environmentError } = await admin
    .from("project_environments")
    .select("id")
    .eq("project_id", envaultProjectId)
    .eq("slug", environmentSlug)
    .maybeSingle();

  if (environmentError || !environment) {
    return {
      syncedLinks: 0,
      skippedLinks: 0,
      appliedChanges: 0,
      errors: [environmentError?.message || "Environment not found"],
    };
  }

  const { data: secrets, error: secretsError } = await admin
    .from("secrets")
    .select("key, value")
    .eq("project_id", envaultProjectId)
    .eq("environment_id", environment.id);

  if (secretsError) {
    return {
      syncedLinks: 0,
      skippedLinks: 0,
      appliedChanges: 0,
      errors: [secretsError.message],
    };
  }

  const upserts: SyncChange[] = [];
  for (const secret of secrets ?? []) {
    try {
      const plaintext = await decrypt(secret.value);
      upserts.push({
        operation: "upsert",
        key: secret.key,
        value: plaintext,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to decrypt key ${secret.key}`;
      console.error("[Vercel Sync] Failed to decrypt secret for full sync", message);
    }
  }

  return syncVercelChangesForEnvironment({
    envaultProjectId,
    environmentSlug,
    changes: upserts,
  });
}
