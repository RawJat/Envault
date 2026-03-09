"use client";

import React, { useRef, useEffect, useState } from "react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RegMark } from "@/components/landing/RegMark";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import type { Author } from "@/lib/changelog-parser";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimelineEntry {
  version: string;
  date: string;
  category: string;
  body: string;
  slug: string;
  authors: Author[];
  mdxSource: MDXRemoteSerializeResult;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

// ─── Badge colours ────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, string> = {
  security:
    "bg-red-200/80 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/40",
  cli: "bg-zinc-200/80 text-zinc-800 border border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700/50",
  integrations:
    "bg-violet-200/80 text-violet-800 border border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/40",
  email:
    "bg-sky-200/80 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40",
  api: "bg-emerald-200/80 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40",
  ui: "bg-amber-200/80 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40",
  docs: "bg-blue-200/80 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40",
  fix: "bg-orange-200/80 text-orange-800 border border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/40",
  performance:
    "bg-teal-200/80 text-teal-800 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/40",
  release:
    "bg-zinc-200/80 text-zinc-700 border border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700/50",
};

function getBadgeStyle(category: string): string {
  return BADGE_STYLES[category.toLowerCase()] ?? BADGE_STYLES.release;
}

// ─── MDX prose components ─────────────────────────────────────────────────────

const mdxComponents = {
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-foreground/80 mt-4 mb-2 uppercase tracking-wider font-mono first:mt-0">
      {children}
    </h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 my-2">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-muted-foreground flex gap-2 leading-relaxed before:content-['▸'] before:text-primary/50 before:mt-0.5 before:shrink-0">
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground/90">{children}</strong>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-muted-foreground leading-relaxed my-1.5">
      {children}
    </p>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="text-xs font-mono bg-muted/60 text-primary px-1 py-0.5 rounded-sm">
      {children}
    </code>
  ),
  blockquote: () => null,
  hr: () => null,
};

// ─── Circuit-path SVG ─────────────────────────────────────────────────────────

const SVG_W = 40;
const CX = SVG_W / 2;
const JOG = 8;
const CHAMFER = 22;

function buildPath(ys: number[]): string {
  if (ys.length < 2) return "";
  const parts = [`M ${CX} ${ys[0]}`];
  for (let i = 0; i < ys.length - 1; i++) {
    const mid = (ys[i] + ys[i + 1]) / 2;
    const dx = i % 2 === 0 ? JOG : -JOG;
    parts.push(
      `L ${CX} ${mid - CHAMFER}`,
      `L ${CX + dx} ${mid}`,
      `L ${CX} ${mid + CHAMFER}`,
      `L ${CX} ${ys[i + 1]}`,
    );
  }
  return parts.join(" ");
}

// ─── Author chip ──────────────────────────────────────────────────────────────

function AuthorChip({ author }: { author: Author }) {
  const [imgError, setImgError] = useState(false);
  const initials = author.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full overflow-hidden border border-border/50 shrink-0 bg-muted flex items-center justify-center">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://github.com/${author.github}.png?size=64`}
            alt={author.name}
            width={28}
            height={28}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[9px] font-mono text-muted-foreground leading-none">
            {initials}
          </span>
        )}
      </div>
      <span className="text-sm text-muted-foreground">{author.name}</span>
    </div>
  );
}

// ─── Mobile version nav ───────────────────────────────────────────────────────

function MobileVersionNav({
  entries,
  activeSlug,
  onSelect,
}: {
  entries: TimelineEntry[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = entries.find((e) => e.slug === activeSlug) ?? entries[0];

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
    <div ref={containerRef}>
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
              entries.length > 1
                ? entries.findIndex((e) => e.slug === activeSlug) /
                  (entries.length - 1)
                : 1
            }
          />
          <span className="truncate text-foreground font-medium">
            v{active?.version}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 ml-2 transition-transform duration-200",
            open && "rotate-180",
          )}
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
                {entries.map((entry) => {
                  const isActive = entry.slug === activeSlug;
                  return (
                    <button
                      key={entry.slug}
                      onClick={() => {
                        onSelect(entry.slug);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-md text-sm transition-colors",
                        isActive
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
                      )}
                    >
                      <span className="flex-1 font-mono">v{entry.version}</span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ChangelogTimeline({ entries }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nodeYs, setNodeYs] = useState<number[]>([]);
  const [svgHeight, setSvgHeight] = useState(0);
  const [activeSlug, setActiveSlug] = useState<string>(entries[0]?.slug ?? "");
  const [isScrolling, setIsScrolling] = useState(false);

  // Measure node Y positions
  useEffect(() => {
    function recalculate() {
      if (!containerRef.current) return;
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const ys: number[] = [];
      let maxY = 0;
      nodeRefs.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const y = rect.top - containerTop + rect.height / 2;
        ys.push(y);
        maxY = Math.max(maxY, y);
      });
      setNodeYs(ys);
      setSvgHeight(maxY + 40);
    }
    recalculate();
    const ro = new ResizeObserver(recalculate);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [entries]);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (observed) => {
        if (isScrolling) return;
        observed.forEach((e) => {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        });
        if (visible.size > 0) {
          let best = "";
          let bestRatio = 0;
          visible.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = id;
            }
          });
          if (best) setActiveSlug(best);
        }
      },
      { rootMargin: "-120px 0px -66% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    entries.forEach(({ slug }) => {
      const el = document.getElementById(slug);
      if (el) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      visible.clear();
    };
  }, [entries, isScrolling]);

  const scrollToEntry = (slug: string) => {
    const el = document.getElementById(slug);
    if (!el) return;
    setIsScrolling(true);
    setActiveSlug(slug);
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 140,
      behavior: "smooth",
    });
    setTimeout(() => setIsScrolling(false), 1000);
  };

  const d = buildPath(nodeYs);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile version nav — BEFORE pt-24 so it's at y≈0 and immediately sticky at top-16 (flush under navbar) */}
      <div className="lg:hidden sticky top-16 z-40 bg-background/95 backdrop-blur border-t border-b border-border/50 relative">
        <MobileVersionNav
          entries={entries}
          activeSlug={activeSlug}
          onSelect={scrollToEntry}
        />
      </div>

      <div className="relative flex-1 pt-16 md:pt-24">
        <RegMark position="top-left" />
        <RegMark position="top-right" />

        {/* Breadcrumb */}
        <div className="container max-w-7xl px-4 md:px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Changelog</span>
          </div>
        </div>

        {/* Grid */}
        <div className="container max-w-7xl px-4 md:px-6 py-6 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 relative">
            <div className="hidden lg:block absolute left-[calc(100%-280px-1.5rem)] top-0 bottom-0 w-px bg-border/30" />

            {/* Left column */}
            <div>
              {/* Title block — matches LegalLayout */}
              <div className="mb-6 pb-6 md:mb-8 md:pb-8 border-b border-border/50">
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">
                  Changelog
                </h1>
                <p className="text-sm font-mono text-muted-foreground">
                  Every notable change to Envault, from the initial commit to
                  the present day.
                </p>
              </div>

              {/* Timeline */}
              <div ref={containerRef} className="relative">
                {/* Circuit SVG — desktop only */}
                <svg
                  className="hidden md:block absolute top-0 pointer-events-none select-none overflow-visible"
                  style={{ left: "7rem" }}
                  width={SVG_W}
                  height={svgHeight}
                  aria-hidden="true"
                >
                  {nodeYs.length >= 2 && (
                    <path
                      d={d}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      strokeOpacity={0.5}
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                  {nodeYs.map((y, i) => (
                    <g key={i}>
                      <circle
                        cx={CX}
                        cy={y}
                        r={4}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        strokeOpacity={0.6}
                      />
                      <circle
                        cx={CX}
                        cy={y}
                        r={1.5}
                        fill="hsl(var(--primary))"
                        fillOpacity={0.8}
                      />
                    </g>
                  ))}
                </svg>

                {/* Entries */}
                {entries.map((entry, index) => (
                  <div
                    key={entry.slug}
                    id={entry.slug}
                    className={cn(
                      "scroll-mt-36",
                      index < entries.length - 1 ? "pb-12 md:pb-16" : "pb-4",
                    )}
                  >
                    {/* Desktop: side-by-side with date column + SVG spacer */}
                    <div className="hidden md:flex gap-0">
                      {/* Date */}
                      <div className="w-28 shrink-0 flex items-start justify-end pr-6 pt-0.5">
                        <div
                          ref={(el) => {
                            nodeRefs.current[index] = el;
                          }}
                        >
                          <span className="text-xs font-mono text-muted-foreground/60 whitespace-nowrap">
                            {entry.date}
                          </span>
                        </div>
                      </div>
                      {/* SVG spacer */}
                      <div className="w-10 shrink-0" />
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={cn(
                              "text-xs font-mono tracking-widest uppercase px-2 py-0.5 rounded-full",
                              getBadgeStyle(entry.category),
                            )}
                          >
                            {entry.category}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground/50">
                            v{entry.version}
                          </span>
                        </div>
                        <div>
                          <MDXRemote
                            {...entry.mdxSource}
                            components={mdxComponents}
                          />
                        </div>
                        {entry.authors.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-border/30 flex items-center gap-4 flex-wrap">
                            {entry.authors.map((author) => (
                              <AuthorChip key={author.github} author={author} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile: stacked layout, no circuit SVG */}
                    <div className="md:hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-muted-foreground/50">
                          {entry.date}
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span
                          className={cn(
                            "text-xs font-mono tracking-widest uppercase px-2 py-0.5 rounded-full",
                            getBadgeStyle(entry.category),
                          )}
                        >
                          {entry.category}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground/50">
                          v{entry.version}
                        </span>
                      </div>
                      <div>
                        <MDXRemote
                          {...entry.mdxSource}
                          components={mdxComponents}
                        />
                      </div>
                      {entry.authors.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-4 flex-wrap">
                          {entry.authors.map((author) => (
                            <AuthorChip key={author.github} author={author} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="sticky top-28 space-y-4">
                <div className="pb-4 border-b border-border/50">
                  <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-muted-foreground">
                    Releases
                  </h2>
                </div>

                <nav className="space-y-1">
                  {entries.map((entry) => {
                    const isActive = activeSlug === entry.slug;
                    return (
                      <button
                        key={entry.slug}
                        onClick={() => scrollToEntry(entry.slug)}
                        className={cn(
                          "w-full text-left text-sm transition-all duration-200 hover:text-foreground group relative py-2 px-3 rounded-md",
                          isActive
                            ? "text-foreground bg-accent/50 font-medium"
                            : "text-muted-foreground hover:bg-accent/30",
                        )}
                      >
                        <span className="font-mono leading-relaxed">
                          v{entry.version}
                        </span>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "2rem", opacity: 1 }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 bg-primary rounded-full"
                          />
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Grid Intersection Accent */}
                <div className="pt-8 mt-8 border-t border-border/30">
                  <div className="w-4 h-4 rounded-full border border-border/50 mx-auto opacity-30" />
                </div>
              </div>
            </motion.aside>
          </div>
        </div>

        <RegMark position="bottom-left" />
        <RegMark position="bottom-right" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
