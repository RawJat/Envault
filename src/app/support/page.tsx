import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SupportView } from "@/components/support/support-view";
import { createClient } from "@/lib/supabase/server";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative blueprint-grid sharp">
      <Navbar user={user} />
      <main className="flex-1 relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <SupportView />
      </main>
      <Footer />
    </div>
  );
}
