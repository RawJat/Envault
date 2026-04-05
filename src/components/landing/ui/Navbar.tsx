"use client";

import { Link } from "next-view-transitions";
import { ShieldCheck } from "lucide-react";
import HamburgerMenu from "@/components/ui/hamburger-menu";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/utils";
import { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";

interface NavbarProps {
  user?: User | null;
}

const NavItem = ({
  href,
  className,
  children,
  pathname,
  setIsOpen,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  pathname: string;
  setIsOpen?: (open: boolean) => void;
}) => {
  if (pathname === href) {
    return (
      <button
        onClick={() => {
          if (setIsOpen) setIsOpen(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={className}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export function Navbar({ user }: NavbarProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // removed inline NavItem

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <motion.header
      className={cn(
        "sticky top-0 left-0 right-0 h-16 z-50 transition-all duration-300 -mb-16",
        scrolled || isOpen
          ? "bg-background backdrop-blur-md border-b border-border/50"
          : "bg-transparent",
      )}
    >
      <div className="container h-full flex items-center justify-between px-4 md:px-6 relative z-50">
        <NavItem
          href="/"
          className="flex items-center gap-2 font-bold text-2xl font-serif"
          pathname={pathname}
          setIsOpen={setIsOpen}
        >
          <ShieldCheck className="w-6 h-6 text-primary" />
          Envault
        </NavItem>

        <div className="flex items-center gap-4">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 text-sm font-medium items-center">
            <NavItem
              href="/docs/platform"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              pathname={pathname}
            >
              Docs
            </NavItem>
            <NavItem
              href="/changelog"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              pathname={pathname}
            >
              Changelog
            </NavItem>
            <NavItem
              href="/support"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              pathname={pathname}
            >
              Support
            </NavItem>
            <NavItem href={user ? "/dashboard" : "/login"} pathname={pathname}>
              <Button
                variant={scrolled ? "default" : "secondary"}
                size="sm"
                className="font-semibold flex items-center gap-2 rounded-none"
              >
                {user ? "Dashboard" : "Login"}
              </Button>
            </NavItem>
          </nav>

          <AnimatedThemeToggler className="hidden md:flex items-center justify-center" />

          {/* Mobile Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <AnimatedThemeToggler />
            <HamburgerMenu
              open={isOpen}
              onToggle={setIsOpen}
              className="rounded-none hover:bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 left-0 right-0 h-[calc(100vh-4rem)] z-50 bg-black/60 backdrop-blur-sm md:hidden flex flex-col cursor-pointer"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-background border-b border-border/50 px-6 py-6 flex flex-col gap-4 shadow-xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="flex flex-col gap-4 text-lg font-medium">
                <NavItem
                  href="/docs/platform"
                  className="text-muted-foreground hover:text-foreground transition-colors border-b border-muted/20 text-left"
                  pathname={pathname}
                  setIsOpen={setIsOpen}
                >
                  Docs
                </NavItem>
                <NavItem
                  href="/changelog"
                  className="text-muted-foreground hover:text-foreground transition-colors border-b border-muted/20 text-left"
                  pathname={pathname}
                  setIsOpen={setIsOpen}
                >
                  Changelog
                </NavItem>
                <NavItem
                  href="/support"
                  className="text-muted-foreground hover:text-foreground transition-colors border-b border-muted/20 text-left"
                  pathname={pathname}
                  setIsOpen={setIsOpen}
                >
                  Support
                </NavItem>
              </nav>
              <div className="flex flex-col gap-2">
                <NavItem
                  href={user ? "/dashboard" : "/login"}
                  pathname={pathname}
                  setIsOpen={setIsOpen}
                >
                  <Button className="w-full" size="lg">
                    {user ? "Dashboard" : "Login"}
                  </Button>
                </NavItem>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
