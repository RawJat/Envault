"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Server, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function FreeTierNotification() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // Define allowed paths to render the notification
  const allowedPaths = ["/changelog", "/support"];
  const isAllowed = pathname === "/" || allowedPaths.some(p => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("envault_hide_freetier_warning");
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("envault_hide_freetier_warning", "true");
  };

  if (!isAllowed || !isVisible) return null;

  return (
    <div className="group fixed hidden md:block bottom-4 right-4 z-50 w-full max-w-[22rem] cursor-default rounded-xl border border-border bg-background/85 backdrop-blur-md p-4 shadow-lg transition-all duration-500 ease-in-out hover:shadow-xl sm:bottom-6 sm:right-6">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex-shrink-0">
          <Server className="h-4 w-4 text-muted-foreground transition-colors duration-500 group-hover:text-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Running on Free Tier Engines
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-sm opacity-50 ring-offset-background transition-all duration-300 hover:scale-110 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="space-y-4 pt-3 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-hover:delay-150">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We&apos;re currently scaling our infrastructure using free-tier nodes. If you experience any delays or connection dropouts while fetching secrets or syncing your environments, don&apos;t sweat it - just hit retry!
                </p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm italic text-muted-foreground">
                    Hit a roadblock?
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open("https://x.com/envault_tech", "_blank")}
                  >
                    <XLogo className="h-3.5 w-3.5" />
                    Reach out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
