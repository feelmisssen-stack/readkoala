import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";
import { v4 as uuid } from "uuid";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const db = readDb();

  const membership = db.chatMemberships.find(
    (m) => m.roomId === id && m.userId === session.userId && m.status === "approved"
  );
  const isCreator = db.chatRooms.find((r) => r.id === id)?.creatorId === session.userId;
  if (!membership && !session.isAdmin && !isCreator) {
    return NextResponse.json({ error: "참여 승인 후 입장할 수 있어요." }, { status: 403 });
  }

  const messages = db.chatMessages
    .filter((m) => m.roomId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const pendingMembers = session.isAdmin
    ? db.chatMemberships.filter((m) => m.roomId === id && m.status === "pending")
    : [];

  return NextResponse.json({ messages, pendingMembers });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const { content } = await request.json();
  const check = validateContent(content);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 });
  }

  const db = readDb();
  const membership = db.chatMemberships.find(
    (m) => m.roomId === id && m.userId === session.userId && m.status === "approved"
  );
  if (!membership) {
    return NextResponse.json({ error: "참여 승인 후 메시지를 보낼 수 있어요." }, { status: 403 });
  }

  const message = {
    id: uuid(),
    roomId: id,
    userId: session.userId,
    username: session.username || "친구",
    content,
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.chatMessages.push(message);
  });

  return NextResponse.json({ message });
}
