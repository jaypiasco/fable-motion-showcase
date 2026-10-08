export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  BACKEND_ORIGIN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Forward backend requests (/api/* and /media/*) to FastAPI backend if configured
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
      const backendOrigin = (env.BACKEND_ORIGIN && env.BACKEND_ORIGIN.trim() !== '')
        ? env.BACKEND_ORIGIN
        : "https://fable-motion-api-581866038534.asia-northeast1.run.app";

      if (!backendOrigin) {
        return new Response(
          JSON.stringify({
            error: "Backend origin not configured",
            message: "Set BACKEND_ORIGIN in Cloudflare Worker environment variables or wrangler.jsonc"
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const backendUrl = new URL(url.pathname + url.search, backendOrigin);
      const headers = new Headers(request.headers);
      headers.set('Host', backendUrl.host);
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      const proxyRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
      });

      const response = await fetch(proxyRequest);

      // Ensure HTTP redirects (301, 302, 307, 308) are passed straight to the browser
      // so OAuth providers (Google, Meta, TikTok) open on their official domains.
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const redirectHeaders = new Headers();
        redirectHeaders.set('Location', response.headers.get('location')!);
        const cookie = response.headers.get('set-cookie');
        if (cookie) {
          redirectHeaders.set('Set-Cookie', cookie);
        }
        return new Response(null, {
          status: response.status,
          statusText: response.statusText,
          headers: redirectHeaders,
        });
      }

      return response;
    }

    // 2. Serve static Next.js export assets from Cloudflare Edge
    return env.ASSETS.fetch(request);
  },
};
