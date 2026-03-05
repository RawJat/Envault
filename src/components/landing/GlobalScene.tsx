"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { SceneContent } from "./Scene";

export function GlobalScene() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [initialDelayPassed, setInitialDelayPassed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const delayTimer = setTimeout(() => setInitialDelayPassed(true), 600);
    const animTimer = setTimeout(() => setIsAnimating(false), 2000);
    return () => {
      clearTimeout(delayTimer);
      clearTimeout(animTimer);
    };
  }, []);

  const isAuthPage =
    pathname?.startsWith("/login") || pathname?.startsWith("/register");
  const isLandingPage = pathname === "/";

  useEffect(() => {
    if (!isLandingPage) return;

    // Only fade on scroll for the landing page
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const newOpacity = Math.max(0, 1 - (scrollY / heroHeight) * 1.5);
      setScrollOpacity(newOpacity);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLandingPage]);

  if (!isAuthPage && !isLandingPage) return null;

  const finalOpacity = !initialDelayPassed
    ? 0
    : isLandingPage
      ? scrollOpacity
      : 1;

  const baseLayout = isAuthPage
    ? "fixed inset-y-0 left-0 w-1/2 hidden lg:block pointer-events-none z-0"
    : "fixed inset-y-0 right-0 w-1/2 hidden md:block pointer-events-none z-0";
  const layoutClass = `${baseLayout} ${isAnimating ? "transition-opacity duration-1000 ease-in-out" : ""}`;

  return (
    <div
      className={layoutClass.trim()}
      style={
        {
          opacity: finalOpacity,
          viewTransitionName: "auth-scene",
        } as React.CSSProperties & { viewTransitionName?: string }
      }
    >
      <Canvas gl={{ preserveDrawingBuffer: true }} key={resolvedTheme}>
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
