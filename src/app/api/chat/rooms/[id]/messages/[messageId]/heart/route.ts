import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id, messageId } = await params;
  const db = readDb();
  const room = db.chatRooms.find(
    (r) => r.id === id && (r.status === "approved" || r.status === "pending")
  );
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  const message = db.chatMessages.find((m) => m.id === messageId && m.roomId === id);
  if (!message) {
    return NextResponse.json({ error: "메시지를 찾을 수 없어요." }, { status: 404 });
  }

  if (message.userId === session.userId) {
    return NextResponse.json({ error: "내 메시지에는 호응을 남길 수 없어요." }, { status: 400 });
  }

  let hearted = false;
  updateDb((d) => {
    const idx = d.chatMessageHearts.findIndex(
      (h) => h.messageId === messageId && h.userId === session.userId
    );
    if (idx >= 0) {
      d.chatMessageHearts.splice(idx, 1);
      hearted = false;
      return;
    }
    d.chatMessageHearts.push({
      id: uuid(),
      messageId,
      roomId: id,
      userId: session.userId!,
      createdAt: new Date().toISOString(),
    });
    hearted = true;
  });

  const updated = readDb();
  const heartCount = updated.chatMessageHearts.filter((h) => h.messageId === messageId).length;

  return NextResponse.json({ ok: true, hearted, heartCount });
}
