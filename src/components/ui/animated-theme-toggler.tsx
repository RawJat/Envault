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

    const isDark = resolvedTheme === "dark";
    const newTheme = isDark ? "light" : "dark";

    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!document.startViewTransition || isReducedMotion) {
      setTheme(newTheme);
      return;
    }

    // Completely disable all CSS transitions natively to prevent them from bleeding into the new view-transition snapshot and causing black "pops".
    document.documentElement.classList.add("disable-transitions");

    const transition = document.startViewTransition(async () => {
      flushSync(() => {
        setTheme(newTheme);
      });
      // Await 100ms so WebGL engines (like React Three Fiber) can paint the new theme into their active buffers before the browser rasterizes the snapshot, preventing the planet from vanishing.
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("disable-transitions");
    });
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    return (
      <button
        ref={buttonRef}
        onClick={toggleTheme}
        className={cn("cursor-pointer", className)}
        data-theme-toggle
        {...props}
      >
        <Moon className="w-5 h-5" />
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
          onClick={toggleTheme}
          className={cn("cursor-pointer", className)}
          data-theme-toggle
          {...props}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
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
