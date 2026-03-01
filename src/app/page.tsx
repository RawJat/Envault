import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { CliSection } from "@/components/landing/CliSection";
import { Footer } from "@/components/landing/Footer";
import { RegMark } from "@/components/landing/RegMark";
import { Testimonials } from "@/components/landing/Testimonials";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Envault - Secure Environment Variable Management",
  description: "End-to-end encrypted secret manager for your entire team.",
  openGraph: {
    images: [
      "/api/og?title=Envault&description=Secure%20Environment%20Variable%20Management",
    ],
  },
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative blueprint-grid sharp">
      {/* <Preloader /> */}
      <Navbar user={user} />
      <main className="flex-1 relative">
        <RegMark position="top-left" />
        <RegMark position="top-right" />
        <Hero />
        <WorkflowSection />
        <CliSection />
        <Features />
        <Testimonials />
        <RegMark position="bottom-left" />
        <RegMark position="bottom-right" />
      </main>
      <Footer />
    </div>
  );
}
