import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

// Next.js hot-reloading in dev can cause multiple clients to be instantiated
// quickly, leading to "Acquiring an exclusive Navigator LockManager lock timed out"
// We ensure a true singleton using globalThis.
const getGlobalSupabaseClient = () => {
  if (typeof window === "undefined") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny: any = globalThis;

  if (!globalAny.__supabaseBrowserClient) {
    globalAny.__supabaseBrowserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { isSingleton: true }, // keep it true just in case
    );
  }
  return globalAny.__supabaseBrowserClient;
};

let clientInstance: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (clientInstance) return clientInstance;

  clientInstance =
    getGlobalSupabaseClient() ||
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

  return clientInstance as SupabaseClient;
}
