import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  try {
    const packageJsonPath = join(process.cwd(), "mcp-server", "package.json");
    const raw = await readFile(packageJsonPath, "utf8");
    const data = JSON.parse(raw) as { version?: string };

    return NextResponse.json({
      latest_version: data.version ?? null,
    });
  } catch (error) {
    console.error("Error fetching MCP version:", error);
    return NextResponse.json({ latest_version: null }, { status: 500 });
  }
}
