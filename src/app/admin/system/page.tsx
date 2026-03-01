import { getComponents, getIncidents } from "@/actions/status";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import SystemStatusView from "./system-status-view";
import type { Viewport, Metadata } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Envault system administration.",
  openGraph: {
    images: [
      "/api/og?title=Admin%20Dashboard&description=Envault%20system%20administration",
    ],
  },
};

export default async function AdminStatusPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Admin Check
  const isAdmin =
    user.user_metadata?.is_admin === true ||
    user.app_metadata?.is_admin === true;
  if (!isAdmin) {
    redirect("/dashboard"); // Or a 403 page
  }

  const components = await getComponents();
  const incidents = await getIncidents(); // Fetch recent 10

  return (
    <Suspense fallback={null}>
      <SystemStatusView
        initialComponents={components}
        initialIncidents={incidents}
      />
    </Suspense>
  );
}
