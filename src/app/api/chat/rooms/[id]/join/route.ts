import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  ensureApprovedChatMembership,
  getChatMembership,
  getChatRoomById,
} from "@/lib/repositories/chat-repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const room = await getChatRoomById(id);
  if (!room || room.status !== "approved") {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  let membership = await getChatMembership(id, session.userId);
  if (!membership || membership.status !== "approved") {
    membership = await ensureApprovedChatMembership(id, session.userId, session.firebaseUid);
  }

  return NextResponse.json({ membership });
}
