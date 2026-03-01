import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Manage your Envault notifications and alerts.",
  openGraph: {
    images: [
      "/api/og?title=Notifications&description=Manage%20your%20notifications%20and%20alerts",
    ],
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
