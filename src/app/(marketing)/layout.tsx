import { Navbar } from "@/components/landing/ui/Navbar";
import { Footer } from "@/components/landing/sections/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Navbar user={user} />
      <div className="flex-1 bg-background">{children}</div>
      <Footer user={user} />
    </>
  );
}
