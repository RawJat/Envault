import { loadedSource } from "@/lib/utils/source";
import { NextResponse } from "next/server";

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
  };

  if (!data.getText) {
    return NextResponse.json(
      { error: "Raw markdown source is unavailable for this document" },
      { status: 500 },
    );
  }

  const markdown = await data.getText("raw");
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
