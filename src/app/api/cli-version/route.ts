
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res = await fetch(
            "https://raw.githubusercontent.com/DinanathDash/Envault/main/cli-wrapper/package.json",
            { next: { revalidate: 3600 } }
        );

        if (!res.ok) {
            throw new Error("Failed to fetch package.json");
        }

        const data = await res.json();
        return NextResponse.json({ version: data.version });
    } catch (error) {
        console.error("Error fetching CLI version:", error);
        return NextResponse.json({ version: null }, { status: 500 });
    }
}
