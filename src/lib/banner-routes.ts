/**
 * Path-based visibility rules for the SystemStatusBanner.
 * Pure utility — no Next.js or Node.js imports, safe in Edge runtime.
 */

// Banner is shown on any path that starts with one of these prefixes.
const SHOW_PREFIXES = [
  "/dashboard",
  "/settings",
  "/project",
  "/notifications",
  "/approve",
  "/admin",
  "/access",
  "/login",
  "/join",
  "/forgot-password",
  "/auth",
];

// Explicit paths where the banner must NEVER appear (exact or prefix match).
const HIDE_PREFIXES = [
  "/",        // landing — exact check handled below
  "/privacy",
  "/terms",
  "/support",
  "/status",
  "/docs",
  "/api",
  "/_next",
  "/robots.txt",
  "/sitemap.xml",
  "/llms-full.txt",
];

export function shouldShowBanner(pathname: string): boolean {
  // Always hide static / non-UI prefixes first.
  if (pathname === "/") return false; // landing page exact match
  for (const hide of HIDE_PREFIXES) {
    if (hide !== "/" && (pathname === hide || pathname.startsWith(hide + "/"))) {
      return false;
    }
  }

  // Show for any explicitly listed prefix.
  for (const show of SHOW_PREFIXES) {
    if (pathname === show || pathname.startsWith(show + "/")) {
      return true;
    }
  }

  // Dynamic [handle]/[slug] routes (authenticated project views) — show.
  const isDynamicHandle = /^\/[^/]+\/[^/]+/.test(pathname);
  return isDynamicHandle;
}
