import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";
import { getRoomParticipantNames } from "@/lib/chat";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const rooms = db.chatRooms
    .filter((r) => r.status === "approved")
    .map((room) => {
      const membership = db.chatMemberships.find(
        (m) => m.roomId === room.id && m.userId === session.userId
      );
      const participants = getRoomParticipantNames(db.chatMessages, room.id);
      return { ...room, membership, participants };
    });

  const pendingRooms = session.isAdmin
    ? db.chatRooms.filter((r) => r.status === "pending")
    : [];

  return NextResponse.json({ rooms, pendingRooms });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { bookId, name } = await request.json();
  const check = validateContent(name);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 });
  }

  const db = readDb();
  const book = db.books.find((b) => b.id === bookId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 400 });
  }

  const room = {
    id: uuid(),
    bookId,
    bookTitle: book.title,
    creatorId: session.userId,
    name: name || `${book.title} 이야기뜰`,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.chatRooms.push(room);
    d.chatMemberships.push({
      id: uuid(),
      roomId: room.id,
      userId: session.userId!,
      status: "approved",
      createdAt: new Date().toISOString(),
    });
  });

  return NextResponse.json({ room });
}
