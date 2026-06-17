import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || !session.isAdmin) {
    return NextResponse.json({ error: "관리자만 승인할 수 있어요." }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await request.json();

  updateDb((db) => {
    const room = db.chatRooms.find((r) => r.id === id);
    if (room) {
      room.status = action === "approve" ? "approved" : "rejected";
    }
  });

  return NextResponse.json({ ok: true });
}
