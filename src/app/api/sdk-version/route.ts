import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  try {
    const packageJsonPath = join(process.cwd(), "src", "lib", "sdk", "package.json");
    const raw = await readFile(packageJsonPath, "utf8");
    const data = JSON.parse(raw) as { version?: string };
    const latestVersion = data.version ?? null;

    const minSupportedFromEnv =
      process.env.ENVAULT_SDK_MIN_SUPPORTED_VERSION?.trim() || latestVersion;

    return NextResponse.json({
      latest_version: latestVersion,
      min_supported_version: minSupportedFromEnv,
    });
  } catch (error) {
    console.error("Error fetching SDK version:", error);
    return NextResponse.json(
      {
        latest_version: null,
        min_supported_version:
          process.env.ENVAULT_SDK_MIN_SUPPORTED_VERSION?.trim() || null,
      },
      { status: 500 },
    );
  }
}
