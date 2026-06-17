import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateLevel } from "@/lib/gamification";

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

  const existing = db.chatMemberships.find(
    (m) => m.roomId === id && m.userId === session.userId
  );
  if (existing) {
    return NextResponse.json({ membership: existing });
  }

  const membership = {
    id: uuid(),
    roomId: id,
    userId: session.userId,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.chatMemberships.push(membership);
  });

  return NextResponse.json({ membership });
}
