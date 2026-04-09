import { SupportView } from "@/components/support/support-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help and support for Envault. Contact our team or view documentation.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Support%20OG.svg"],
  },
};

export default async function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative blueprint-grid sharp">
      <main className="flex-1 relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <SupportView />
      </main>
    </div>
  );
}
