import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadKoalaStatus } from "@/lib/koala-service";
import { restoreKoalaAvatar } from "@/lib/repositories/koala-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { avatarId } = (await request.json().catch(() => ({}))) as { avatarId?: string };
  if (!avatarId || !(await restoreKoalaAvatar(session.userId, avatarId))) {
    return NextResponse.json({ error: "다시 쓸 수 있는 코알라가 아니에요." }, { status: 400 });
  }

  const { status } = await loadKoalaStatus(session.userId);
  return NextResponse.json({ koala: status });
}
