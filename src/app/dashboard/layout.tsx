import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsSync } from "@/components/dashboard/projects-sync";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Envault projects and secrets.",
  openGraph: {
    images: [
      "/api/og?title=Dashboard&description=Manage%20your%20Envault%20projects",
    ],
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
