import { NextResponse } from "next/server";
import { isDictionaryApiConfigured } from "@/lib/dictionary-config";

export async function GET() {
  return NextResponse.json({ configured: isDictionaryApiConfigured() });
}
