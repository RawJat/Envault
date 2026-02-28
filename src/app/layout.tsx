import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthSync } from "@/components/auth/auth-sync";
import { createClient } from "@/lib/supabase/server";
import { Analytics } from "@vercel/analytics/react";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { ShortcutProvider } from "@/components/providers/shortcut-provider";
import { HmacProvider } from "@/components/hmac-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getServerOS } from "@/lib/os";
import { ViewTransitions } from "next-view-transitions";
import { headers } from "next/headers";
import { SystemStatusBanner } from "@/components/ui/system-status-banner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.envault.tech"),
  title: {
    default: "Envault - Secure Secrets Management & Environment Variable Vault",
    template: "%s | Envault",
  },
  description:
    "Envault is a secure vault for your environment variables featuring end-to-end encryption. Manage secrets with confidence using AES-256-GCM and simplify team collaboration for developers.",
  keywords: [
    "secrets management",
    ".env management",
    "env management",
    ".env storage",
    "env storage",
    ".env viewer",
    "env viewer",
    ".env editor",
    "env editor",
    ".env sync",
    "env sync",
    ".env sync",
    "env sync",
    "env vault",
    "envvault",
    "envault.tech",
    "env secure storage",
    "env secure vault",
    "environment variables",
    "secure vault",
    "end-to-end encryption",
    "developer CLI",
    "AES-256-GCM",
    "team collaboration security",
    "developer tools",
  ],
  alternates: {
    canonical: "/",
  },
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
    description:
      "Manage your environment variables securely with Envault. End-to-end encryption for your peace of mind.",
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
  const headersList = await headers();
  const showBanner = headersList.get("x-show-status-banner") === "1";

  return (
    <ViewTransitions>
      <html lang="en" suppressHydrationWarning data-os={os}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link
            href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Instrument+Serif:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen bg-background font-sans antialiased">
          <SystemStatusBanner show={showBanner} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "Envault",
                applicationCategory: "DeveloperApplication",
                operatingSystem: "Any",
                description:
                  "Envault is a secure vault for your environment variables featuring end-to-end encryption.",
                featureList:
                  "Secure Secret Storage, End-to-End Encryption, Team Collaboration, CLI Integration, AES-256-GCM",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
              }),
            }}
          />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <ShortcutProvider>
                <HmacProvider>
                  {children}
                  <Toaster />
                  {user && (
                    <>
                      <AuthSync user={user} />

                      <NotificationProvider />
                    </>
                  )}
                  <Analytics />
                </HmacProvider>
              </ShortcutProvider>
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
