import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadKoalaStatus } from "@/lib/koala-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { status } = await loadKoalaStatus(session.userId);
  return NextResponse.json({ koala: status });
}
