import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    // Server-side calls (Vercel) should bypass the Cloudflare proxy and
    // call Supabase directly. The proxy exists for end-user browsers to
    // circumvent ISP-level DNS blocks, but Vercel's servers (in AWS
    // data centers) don't have that problem and may be blocked by Cloudflare
    // Bot Fight Mode if routed through the proxy (returning HTML, not JSON).
    // Set SUPABASE_DIRECT_URL to the real supabase.co project URL in Vercel.
    process.env.SUPABASE_DIRECT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
