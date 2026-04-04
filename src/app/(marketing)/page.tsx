import { Hero } from "@/components/landing/sections/Hero";
import { PlatformHighlights } from "@/components/landing/sections/PlatformHighlights";
import { Features } from "@/components/landing/sections/Features";
import { WorkflowSection } from "@/components/landing/sections/WorkflowSection";
import { CliSection } from "@/components/landing/sections/CliSection";
import { RegMark } from "@/components/landing/ui/RegMark";
import { Testimonials } from "@/components/landing/sections/Testimonials";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Envault - Secure Environment Variable Management",
  description: "End-to-end encrypted secret manager for your entire team.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "https://www.envault.tech",
    siteName: "Envault",
    images: [
      "/api/og?title=Envault&description=Secure%20Environment%20Variable%20Management",
    ],
  },
};

export default async function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative blueprint-grid sharp">
      <main className="flex-1 relative">
        <RegMark position="top-left" />
        <RegMark position="top-right" />
        <Hero />
        <WorkflowSection />
        <CliSection />
        <PlatformHighlights />
        <Features />
        <Testimonials />
        <RegMark position="bottom-left" />
        <RegMark position="bottom-right" />
      </main>
    </div>
  );
}
