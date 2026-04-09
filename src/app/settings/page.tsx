import SettingsView from "@/components/settings/settings-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your Envault account settings, API keys, and preferences.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Dashboard%20OG.png"],
  },
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
