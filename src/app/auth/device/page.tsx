import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DeviceAuthForm } from "./device-auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Device Authentication",
  description: "Authenticate your Envault CLI session.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Login%20OG.png"],
  },
};

export default async function DeviceAuthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/auth/device");
  }

  return <DeviceAuthForm />;
}
