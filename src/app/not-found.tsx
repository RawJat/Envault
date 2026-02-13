import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { RegMark } from "@/components/landing/RegMark";
import { Stacked404 } from "@/components/landing/Stacked404";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const user = null;

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative blueprint-grid sharp overflow-hidden">
      <Navbar user={user} />

      <main className="flex-1 relative flex flex-col items-center justify-center w-full px-4 py-20 mt-16">
        <RegMark position="top-left" />
        <RegMark position="top-right" />

        <div className="relative z-10 w-full max-w-5xl mx-auto text-center space-y-12">
          <Stacked404 />

          <div className="space-y-6 max-w-md mx-auto relative z-20">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Page Not Found
            </h1>
            <p className="text-muted-foreground text-lg">
              You&apos;ve reached a secure vault that doesn&apos;t exist.
            </p>

            <div className="flex flex-row items-center justify-center gap-4 pt-4">
              <BackButton />
              <Link href="/">
                <Button size="lg">Return Home</Button>
              </Link>
            </div>
          </div>
        </div>

        <RegMark position="bottom-left" />
        <RegMark position="bottom-right" />
      </main>

      <Footer />
    </div>
  );
}
