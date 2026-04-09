import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to your Envault account to access your secure environment variables.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Login%20OG.svg"],
  },
};

export default async function LoginPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const next =
    typeof searchParams.next === "string" ? searchParams.next : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (next && next.startsWith("/")) {
      redirect(next);
    }
    redirect("/dashboard");
  }

  return (
    <AuthLayout>
      <AuthForm />
    </AuthLayout>
  );
}
