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

    // Tell Supabase Auth what the TRUE external hostname is,
    // otherwise OAuth providers (GitHub/Google) will display the proxy URL
    // instead of envault.tech to the user.
    headers.set("X-Forwarded-Host", url.hostname);

    // Passkey WebAuthn requires the Origin header to match on the relying party.
    // Supabase enforces strict Origin checking for auth requests.
    // If the origin exists, we rewrite it from the frontend URL to the backend URL
    // so Supabase accepts the request.
    const origin = headers.get("Origin");
    if (origin) {
      try {
        const originUrl = new URL(origin); // validate it's a URL
        // Forward the original application hostname to Supabase so OAuth providers
        // (e.g. GitHub/Google) display "envault.tech" instead of "api.envault.tech"
        // and route callbacks back to the correct frontend URL.
        headers.set("X-Forwarded-Host", originUrl.host);
      } catch {
        // Ignore invalid origins
      }
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
        redirect: "follow",
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
