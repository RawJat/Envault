"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Kbd } from "./kbd";

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
}

let themeToggleInFlight = false;

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); // Avoid hydration mismatch
  }, []);

  const toggleTheme = useCallback(() => {
    if (!buttonRef.current) return;
    if (themeToggleInFlight) return;
    themeToggleInFlight = true;

    const isDark = resolvedTheme === "dark";
    const newTheme = isDark ? "light" : "dark";

    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!document.startViewTransition || isReducedMotion) {
      setTheme(newTheme);
      themeToggleInFlight = false;
      return;
    }

    // Freeze old root background and disable standard CSS transitions so it doesn't jarringly crossfade while expanding
    document.documentElement.classList.add("disable-transitions", "theme-transitioning");
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("disable-transitions", "theme-transitioning");
        themeToggleInFlight = false;
      });
    };

    // Fallback cleanup in case the View Transition promise never settles.
    const fallbackTimer = window.setTimeout(cleanup, duration + 300);

    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme);
        });
      });

      transition.finished.finally(() => {
        window.clearTimeout(fallbackTimer);
        cleanup();
      });
    } catch {
      window.clearTimeout(fallbackTimer);
      cleanup();
      setTheme(newTheme);
    }
  }, [duration, resolvedTheme, setTheme]);

  if (!mounted) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleTheme}
        className="cursor-pointer transition-transform duration-300 ease-out motion-reduce:transition-none"
        data-theme-toggle
        {...props}
      >
        <Moon
          className="w-5 h-5 transition-transform duration-500 ease-out motion-reduce:transition-none"
        />
        <span className="sr-only">Toggle theme (t)</span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleTheme}
          className="cursor-pointer transition-transform duration-300 ease-out motion-reduce:transition-none"
          data-theme-toggle
          {...props}
        >
          {isDark ? (
            <Sun
              className="w-5 h-5 transition-transform duration-500 ease-out motion-reduce:transition-none"
            />
          ) : (
            <Moon
              className="w-5 h-5 transition-transform duration-500 ease-out motion-reduce:transition-none"
            />
          )}
          <span className="sr-only">Toggle theme (t)</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="flex items-center gap-2">
          Toggle theme <Kbd>T</Kbd>
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
