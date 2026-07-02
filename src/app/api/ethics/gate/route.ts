import { NextResponse } from "next/server";
import { getEthicsGateMode } from "@/lib/ai-ethics-content";
import { getUserEthicsState, recordEthicsSkippedUse } from "@/lib/ethics-user";
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

  if (session.aiHelperEthicsAckedAt) {
    return NextResponse.json({ required: false, acked: true });
  }

  const ethicsState = await getUserEthicsState(session.firebaseUid);
  const aiHelperAckCount = ethicsState?.aiHelperAckCount ?? 0;
  const nextUseNumber = aiHelperAckCount + 1;
  const mode = getEthicsGateMode(nextUseNumber, session.firebaseUid);

  if (!mode) {
    if (ethicsState) {
      await recordEthicsSkippedUse(session.firebaseUid);
    }
    session.aiHelperEthicsAckedAt = new Date().toISOString();
    await session.save();
    return NextResponse.json({ required: false, skipped: true, useNumber: nextUseNumber });
  }

  return NextResponse.json({
    required: true,
    mode,
    useNumber: nextUseNumber,
  });
}
