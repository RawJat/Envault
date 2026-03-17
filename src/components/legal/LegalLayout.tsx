"use client";

import { useState, useEffect, useRef } from "react";
import { RegMark } from "@/components/landing/ui/RegMark";
import { ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "next-view-transitions";
import { SlideUp } from "@/components/landing/animations/SlideUp";
import { FadeIn } from "@/components/landing/animations/FadeIn";
import { ScrollProgress } from "@/components/ui/scroll-progress";

interface Section {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
}

function MobileSectionNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: Section[];
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="lg:hidden sticky top-16 z-40 bg-background/95 backdrop-blur border-t border-b border-border/50 relative"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 md:px-6 py-3 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <ScrollProgress
            size={16}
            strokeWidth={1.5}
            className="shrink-0 opacity-80"
            progress={
              sections.length > 1
                ? sections.findIndex((s) => s.id === activeSection) /
                  (sections.length - 1)
                : 1
            }
          />
          <span className="truncate text-foreground font-medium">
            {active?.title}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 bg-background backdrop-blur-md border-b border-border/50 shadow-md"
          >
            <div className="relative">
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/90 to-transparent z-10" />
              <nav className="px-4 md:px-6 py-2 space-y-0.5 max-h-64 overflow-y-auto">
                {sections.map((section, index) => {
                  const isActive = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        onSelect(section.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-md text-sm transition-colors ${
                        isActive
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                      }`}
                    >
                      <span className="font-mono text-xs opacity-60 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 leading-relaxed">
                        {section.title}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent z-10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LegalLayout({
  title,
  lastUpdated,
  sections,
  children,
}: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(
    sections[0]?.id || "",
  );
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY < 100 && sections.length > 0 && !isScrolling) {
        setActiveSection(sections[0].id);
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [sections, isScrolling]);

  useEffect(() => {
    const observerOptions = {
      rootMargin: "-120px 0px -66% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    const visibleSections = new Map<string, number>();

    const observer = new IntersectionObserver((entries) => {
      // Skip updates while programmatically scrolling
      if (isScrolling) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleSections.set(entry.target.id, entry.intersectionRatio);
        } else {
          visibleSections.delete(entry.target.id);
        }
      });

      // Find the section with the highest intersection ratio
      if (visibleSections.size > 0) {
        let maxRatio = 0;
        let topSection = "";

        visibleSections.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            topSection = id;
          }
        });

        if (topSection) {
          setActiveSection(topSection);
        }
      }
    }, observerOptions);

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
      visibleSections.clear();
    };
  }, [sections, isScrolling]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      setIsScrolling(true);
      setActiveSection(id); // Immediately set active for visual feedback

      // Calculate offset from top of viewport (navbar + breadcrumb + padding)
      const offset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Re-enable observer after scroll completes
      setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MobileSectionNav
        sections={sections}
        activeSection={activeSection}
        onSelect={scrollToSection}
      />

      <div className="relative flex-1 pt-16 md:pt-24">
        {/* Grid Accents */}
        <RegMark position="top-left" />
        <RegMark position="top-right" />

        {/* Breadcrumbs */}
        <FadeIn delay={0.1} className="container max-w-7xl px-4 md:px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{title}</span>
          </div>
        </FadeIn>

        {/* Main Grid Layout */}
        <div className="container max-w-7xl px-4 md:px-6 py-6 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 relative">
            {/* Vertical Grid Line */}
            <div className="hidden lg:block absolute left-[calc(100%-280px-1.5rem)] top-0 bottom-0 w-px bg-border/30" />

            {/* Main Content Area */}
            <SlideUp delay={0.2} yOffset={20} className="max-w-3xl">
              {/* Title */}
              <div className="mb-6 pb-6 md:mb-8 md:pb-8 border-b border-border/50">
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">
                  {title}
                </h1>
                <p className="text-sm font-mono text-muted-foreground">
                  Last updated: {lastUpdated}
                </p>
              </div>

              {/* Content */}
              <div className="prose prose-stone dark:prose-invert max-w-none">
                {children}
              </div>
            </SlideUp>

            {/* Sticky Sidebar Navigation */}
            <SlideUp delay={0.3} yOffset={20} className="hidden lg:block">
              <div className="sticky top-28 space-y-4">
                <div className="pb-4 border-b border-border/50">
                  <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-muted-foreground">
                    On this page
                  </h2>
                </div>

                <nav className="space-y-1">
                  {sections.map((section, index) => {
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left text-sm transition-all duration-200 hover:text-foreground group relative py-2 px-3 rounded-md ${
                          isActive
                            ? "text-foreground bg-accent/50 font-medium"
                            : "text-muted-foreground hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs opacity-60 shrink-0">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="flex-1 leading-relaxed">
                            {section.title}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                {/* Grid Intersection Accent */}
                <div className="pt-8 mt-8 border-t border-border/30">
                  <div className="w-4 h-4 rounded-full border border-border/50 mx-auto opacity-30" />
                </div>
              </div>
            </SlideUp>
          </div>
        </div>

        {/* Bottom Accents */}
        <RegMark position="bottom-left" />
        <RegMark position="bottom-right" />
      </div>
    </div>
  );
}
