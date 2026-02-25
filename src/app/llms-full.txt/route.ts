import { readFileSync } from "fs";
import { join } from "path";

/**
 * Serve the auto-generated llms-full.txt file
 * This endpoint ensures the file is always available with proper headers
 */
export async function GET() {
  try {
    // Try to read the generated file from public directory
    const filePath = join(process.cwd(), "public", "llms-full.txt");
    const content = readFileSync(filePath, "utf-8");

    return new Response(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", // 1 hour cache
        "X-Generated": "true",
        "X-Last-Generated": new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to serve llms-full.txt:", error);

    return new Response(
      "Error: llms-full.txt not found. Run `npm run generate:llms` to generate the file.",
      {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      }
    );
  }
}
