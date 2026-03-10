import type { Metadata } from "next";
import { parseChangelog } from "@/lib/changelog-parser";
import {
  ChangelogTimeline,
  type TimelineEntry,
} from "@/components/changelog/ChangelogTimeline";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Every notable release to Envault — new features, security patches, and CLI updates, documented in order.",
  alternates: {
    canonical: "/changelog",
  },
  openGraph: {
    url: "https://www.envault.tech/changelog",
    siteName: "Envault",
    images: ["/api/og?title=Changelog&description=Envault+Release+History"],
  },
};

export default async function ChangelogPage() {
  const raw = parseChangelog();

  const entries: TimelineEntry[] = raw.map((entry) => ({
    version: entry.version,
    date: entry.date,
    category: entry.category,
    body: entry.body,
    slug: entry.slug,
    authors: entry.authors,
  }));

  return <ChangelogTimeline entries={entries} />;
}
