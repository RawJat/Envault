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

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  return null;
}
