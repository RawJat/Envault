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
