import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { UpdatePasswordForm } from "./update-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Update your Envault account password.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Login%20OG.svg"],
  },
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthLayout>
      <UpdatePasswordForm />
    </AuthLayout>
  );
}
