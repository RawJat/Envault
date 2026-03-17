"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export function RootRefreshHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const lastPathname = useRef(pathname);
  const lastRefreshTime = useRef(0);

  // Update the ref whenever the pathname changes normally
  useEffect(() => {
    lastPathname.current = pathname;
    lastRefreshTime.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    // Listen for browser back/forward buttons
    const handlePopState = () => {
      // If we were in /docs and are now going back to a non-docs page
      if (
        lastPathname.current?.startsWith("/docs") &&
        !window.location.pathname.startsWith("/docs")
      ) {
        window.location.reload();
      }
    };

    // Listen for window focus to refresh data (throttled to 15s)
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastRefreshTime.current > 15000) {
        lastRefreshTime.current = now;
        router.refresh();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router]);

  return null;
}
