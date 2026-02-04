import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthSync } from "@/components/auth/auth-sync";
import { ReauthDialog } from "@/components/auth/reauth-dialog";
import { SessionMonitor } from "@/components/auth/session-monitor";
import { createClient } from "@/lib/supabase/server";
import { Analytics } from "@vercel/analytics/react";
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { ShortcutProvider } from "@/components/providers/shortcut-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.envault.tech"),
  title: {
    default: "Envault - Secure Environment Variables",
    template: "%s | Envault",
  },
  description: "Envault is a premium, secure vault for your environment variables. Share and manage secrets with confidence using end-to-end encryption.",
  keywords: ["environment variables", "security", "secrets management", "developer tools", "encryption"],
  authors: [{ name: "Envault Team" }],
  creator: "Envault",
  verification: {
    google: "3TJJp9KaT8xn84Rn-kxxru-6GnR20ZQQBiPhbtiS2vc",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.envault.tech",
    title: "Envault - Secure Environment Variables",
    description: "Manage your environment variables securely with Envault. End-to-end encryption for your peace of mind.",
    siteName: "Envault",
    images: [
      {
        url: "/open-graph.png",
        width: 1200,
        height: 630,
        alt: "Envault - Secure Environment Variables",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Envault - Secure Environment Variables",
    description: "Premium, secure vault for your environment variables.",
    creator: "@envault",
    images: ["/open-graph.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

import { TooltipProvider } from "@/components/ui/tooltip";
import { getServerOS } from "@/lib/os";
import { Google_Sans } from "next/font/google";

const googleSans = Google_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-google-sans",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const os = await getServerOS();

  return (
    <html lang="en" suppressHydrationWarning data-os={os}>
      <body className={`min-h-screen bg-background font-sans antialiased ${googleSans.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ShortcutProvider>
              {children}
              <Toaster />
              {user && (
                <>
                  <AuthSync user={user} />
                  <SessionMonitor />
                  <ReauthDialog />
                  <NotificationProvider />
                </>
              )}
              <Analytics />
            </ShortcutProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
