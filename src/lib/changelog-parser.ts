import fs from "fs";
import path from "path";

export interface Author {
  name: string;
  github: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  rawDate: Date;
  category: string;
  body: string;
  slug: string;
  authors: Author[];
}

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/security|hmac|csp|passkey|webauthn|oauth|encrypt/i, "Security"],
  [/cli/i, "CLI"],
  [/github|integration/i, "Integrations"],
  [/email|resend|digest/i, "Email"],
  [/api|route|endpoint/i, "API"],
  [/ui|component|design|animation|navbar|theme/i, "UI"],
  [/doc|documentation|fumadoc/i, "Docs"],
  [/fix|resolve|patch/i, "Fix"],
  [/performance|cach|redis|optim/i, "Performance"],
];

function detectCategory(text: string): string {
  for (const [pattern, label] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return "Release";
}

function formatDisplayDate(rawDate: Date): string {
  return rawDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function parseChangelog(): ChangelogEntry[] {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  const raw = fs.readFileSync(changelogPath, "utf-8");

  // Split on ## headings — each is one release
  const sections = raw.split(/^## /m).filter(Boolean);

  const entries: ChangelogEntry[] = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const heading = lines[0].trim();

    // Matches "1.3.0 — 2026-03-09" or "1.3.0" or "1.3.0 (2026-03-09)"
    const versionMatch = heading.match(/^(\d+\.\d+\.\d+)/);
    if (!versionMatch) continue;

    const version = versionMatch[1];
    const dateMatch = heading.match(/(\d{4}-\d{2}-\d{2})/);
    const rawDate = dateMatch ? new Date(dateMatch[1]) : new Date();
    const date = formatDisplayDate(rawDate);

    let body = lines.slice(1).join("\n").trim();

    // Extract > Authors: line and strip it from the body
    const authors: Author[] = [];
    const authorLineMatch = body.match(/^> Authors:\s*(.+)$/m);
    if (authorLineMatch) {
      // Split by comma and parse each "Name (GitHubHandle)" part individually
      for (const part of authorLineMatch[1].split(",")) {
        const m = part.trim().match(/^(.+?)\s*\((\w+)\)$/);
        if (m) authors.push({ name: m[1].trim(), github: m[2] });
      }
      body = body.replace(/^> Authors:.*$\n?/m, "").trim();
    }

    // Strip trailing --- separators that MDX would render as <hr>
    body = body.replace(/\n+---\s*$/, "").trim();

    const category = detectCategory(body + " " + heading);
    const slug = `v${version}`;

    entries.push({ version, date, rawDate, category, body, slug, authors });
  }

  // Newest first
  return entries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
}
