import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsSync } from "@/components/dashboard/ui/projects-sync";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Envault projects and secrets.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Dashboard%20OG.svg"],
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <ProjectsSync />
      {children}
    </>
  );
}
