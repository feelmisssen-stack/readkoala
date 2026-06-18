import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google-admin";

export async function GET() {
  try {
    return NextResponse.redirect(getGoogleAuthUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth 설정 오류";
    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }
}
