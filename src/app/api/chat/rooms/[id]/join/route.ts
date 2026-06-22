import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureApprovedMembership } from "@/lib/chat";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const db = readDb();
  const room = db.chatRooms.find((r) => r.id === id && r.status === "approved");
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  let membership = db.chatMemberships.find((m) => m.roomId === id && m.userId === session.userId);
  if (!membership || membership.status !== "approved") {
    updateDb((d) => {
      membership = ensureApprovedMembership(d, id, session.userId!);
    });
  }

  return NextResponse.json({ membership });
}
