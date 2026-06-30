import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, message: "서버가 동작 중이에요." });
}
