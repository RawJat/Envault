export interface Env {
  SUPABASE_URL: string;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const proxyUrl = env.SUPABASE_URL;

    if (!proxyUrl) {
      return new Response("Missing SUPABASE_URL environment variable", {
        status: 500,
      });
    }

    const targetUrl = new URL(proxyUrl);

    // Rewrite hostname and protocol to the underlying Supabase project
    url.hostname = targetUrl.hostname;
    url.protocol = targetUrl.protocol;
    url.port = targetUrl.port;

    // Reconstruct headers.
    const headers = new Headers(request.headers);

    // We explicitly remove the `Host` header to allow `fetch()` to populate it
    // with `targetUrl.hostname` based on the new URL of our request.
    headers.delete("Host");

    // Forward the X-Forwarded-For to preserve client IP if possible
    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp) {
      headers.set("X-Forwarded-For", clientIp);
    }

    // --- Fix OAuth Redirect Callbacks ---
    // Supabase Auth binds the OAuth callback (PKCE) domain to the Host header.
    // We inject X-Forwarded-Host so Supabase uses the real frontend domain
    // (e.g. www.envault.tech) instead of the proxy domain (api.envault.tech).
    //
    // SECURITY: Only trust Origins/Referers from OUR domains.
    // Never use a foreign Referer like https://github.com/ - that would cause
    // Supabase to redirect token responses to GitHub, which returns HTML,
    // breaking JSON parsing during the OAuth code exchange (auth-code-error).
    const TRUSTED_DOMAINS = ["envault.tech", "localhost"];
    const isTrustedHost = (host: string) =>
      TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));

    let clientHost: string | null = null;
    const origin = headers.get("Origin");
    const referer = headers.get("Referer");

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (isTrustedHost(originUrl.hostname)) {
          clientHost = originUrl.host;
          // Rewrite Origin to the backend URL so Supabase CORS/WebAuthn checks pass.
          headers.set("Origin", targetUrl.origin);
        }
      } catch {
        // Ignore invalid origins
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        // Only use Referer if it's from our own app, never from OAuth providers.
        if (isTrustedHost(refererUrl.hostname)) {
          clientHost = refererUrl.host;
        }
      } catch {
        // Ignore invalid referers
      }
    }

    // Only set X-Forwarded-Host if we have a verified trusted client host.
    // Leave it absent for server-to-server calls (Vercel → proxy) so Supabase
    // uses its own configured Site URL for any internal redirects.
    if (clientHost) {
      headers.set("X-Forwarded-Host", clientHost);
    }

    try {
      // The Cloudflare fetch directly accepts the modified target URL string
      // alongside the original request options.
      const response = await fetch(url.toString(), {
        method: request.method,
        headers: headers,
        body:
          request.method !== "GET" && request.method !== "HEAD"
            ? request.body
            : undefined,
        redirect: "manual",
      });

      // We wrap the response to ensure headers are immutable when passing back,
      // though typically returning fetch() result directly works in CF Workers,
      // wrapping it allows header modifications if needed in the future.
      const proxyResponse = new Response(response.body, response);

      // Force CORS headers on the proxy response if needed
      if (origin) {
        proxyResponse.headers.set("Access-Control-Allow-Origin", origin);
        proxyResponse.headers.set("Access-Control-Allow-Credentials", "true");
      }

      // The Supabase API already outputs broad CORS headers,
      // returning it as-is is usually perfectly fine.
      return proxyResponse;
    } catch (error) {
      const e = error as Error;
      return new Response(`Proxy error: ${e.message}`, { status: 502 });
    }
  },
};

export default worker;
