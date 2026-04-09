import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Manage your Envault notifications and alerts.",
  openGraph: {
    siteName: "Envault",
    images: ["/open-graph/Dashboard%20OG.svg"],
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
