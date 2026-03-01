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
    images: [
      "/api/og?title=Settings&description=Manage%20your%20account%20settings%20and%20API%20keys",
    ],
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
