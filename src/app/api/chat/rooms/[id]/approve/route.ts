import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateChatRoomStatus } from "@/lib/repositories/chat-repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || !session.isAdmin) {
    return NextResponse.json({ error: "관리자만 승인할 수 있어요." }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await request.json();
  const status = action === "approve" ? "approved" : "rejected";
  const updated = await updateChatRoomStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
