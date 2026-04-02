import { loadedSource } from "@/lib/utils/source";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DOCS_ROOT = path.resolve(process.cwd(), "content/docs");

function isPathInsideDocsRoot(targetPath: string): boolean {
  const relative = path.relative(DOCS_ROOT, targetPath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function readMarkdownFromDisk(filePath: string): Promise<string | null> {
  const absolutePath = path.resolve(DOCS_ROOT, filePath);
  if (!isPathInsideDocsRoot(absolutePath)) {
    return null;
  }

  try {
    return await readFile(absolutePath, "utf-8");
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get("slug");
  const slug =
    slugParam && slugParam.trim().length > 0
      ? slugParam
          .split("/")
          .map((segment) => segment.trim())
          .filter(Boolean)
      : undefined;

  const page = loadedSource.getPage(slug);
  if (!page) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const data = page.data as {
    getText?: (type: "raw" | "processed") => Promise<string>;
    info?: {
      path?: string;
    };
  };

  let markdown: string | null = null;

  if (data.getText) {
    try {
      const raw = await data.getText("raw");
      if (raw.trim().length > 0) {
        markdown = raw;
      }
    } catch {
      markdown = null;
    }
  }

  if (!markdown) {
    const fallbackPath = data.info?.path ?? (slug?.length ? `${slug.join("/")}.mdx` : "index.mdx");
    markdown = await readMarkdownFromDisk(fallbackPath);
  }

  if (!markdown) {
    return NextResponse.json(
      { error: "Raw markdown source is unavailable for this document" },
      { status: 500 },
    );
  }

  const fileName = path.basename(data.info?.path ?? (slug?.length ? `${slug[slug.length - 1]}.mdx` : "index.mdx"));

  return new NextResponse(markdown, {
    headers: {
      // text/plain + inline prevents browsers from downloading a nameless file.
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
