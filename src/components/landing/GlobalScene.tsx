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

    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
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

    const opacity = isLandingPage ? scrollOpacity : 1;

    const layoutClass = isAuthPage
        ? "fixed inset-y-0 left-0 w-1/2 hidden lg:block pointer-events-none z-0"
        : "fixed inset-y-0 right-0 w-1/2 hidden md:block pointer-events-none z-0";

    return (
        <div
            className={layoutClass}
            style={{
                opacity,
                viewTransitionName: "auth-scene",
            } as React.CSSProperties & { viewTransitionName?: string }}
        >
            <Canvas gl={{ preserveDrawingBuffer: true }} key={resolvedTheme}>
                <Suspense fallback={null}>
                    <SceneContent />
                </Suspense>
            </Canvas>
        </div>
    );
}
