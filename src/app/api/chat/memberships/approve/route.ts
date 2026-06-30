import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateChatMembershipStatus } from "@/lib/repositories/chat-repository";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId || !session.isAdmin) {
    return NextResponse.json({ error: "관리자만 승인할 수 있어요." }, { status: 403 });
  }

  const { membershipId, action } = await request.json();
  const status = action === "approve" ? "approved" : "rejected";
  const updated = await updateChatMembershipStatus(
    membershipId,
    status,
    undefined,
    session.firebaseUid
  );
  if (!updated) {
    return NextResponse.json({ error: "참여 신청을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
