import { NextResponse } from "next/server";
import { getEthicsGateMode } from "@/lib/ai-ethics-content";
import { getUserEthicsState, recordEthicsSkippedLogin } from "@/lib/ethics-user";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

async function getStudentSession() {
  const session = await getSession();
  if (!session.firebaseUid || session.isAdmin || session.googleAdminEmail) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await getStudentSession();
  if (!session?.firebaseUid) {
    return NextResponse.json({ required: false });
  }

  if (session.ethicsAckedAt) {
    return NextResponse.json({ required: false, acked: true });
  }

  const ethicsState = await getUserEthicsState(session.firebaseUid);
  if (!ethicsState) {
    return NextResponse.json({ error: "회원 정보를 찾을 수 없어요." }, { status: 404 });
  }

  const nextLoginNumber = ethicsState.lifetimeLoginCount + 1;
  const mode = getEthicsGateMode(nextLoginNumber, session.firebaseUid);

  if (!mode) {
    await recordEthicsSkippedLogin(session.firebaseUid);
    session.ethicsAckedAt = new Date().toISOString();
    await session.save();
    return NextResponse.json({ required: false, skipped: true, loginNumber: nextLoginNumber });
  }

  return NextResponse.json({
    required: true,
    mode,
    loginNumber: nextLoginNumber,
  });
}
