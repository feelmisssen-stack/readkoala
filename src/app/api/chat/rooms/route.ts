import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/session";
import { rejectInvalidContentForUser } from "@/lib/content-filter-api";
import { getRoomParticipantNames } from "@/lib/chat";
import { buildUserDisplayMap } from "@/lib/user-display";
import { getBookById } from "@/lib/repositories/books-repository";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import {
  createChatRoomWithMembership,
  listChatMemberships,
  listAllChatMessages,
  listPendingChatRooms,
  listVisibleChatRooms,
} from "@/lib/repositories/chat-repository";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const [rooms, memberships, messages, feedData] = await Promise.all([
    listVisibleChatRooms(),
    listChatMemberships(),
    listAllChatMessages(),
    loadFeedDatabase(),
  ]);

  const displayMap = buildUserDisplayMap(feedData.users);
  const enrichedRooms = rooms.map((room) => {
    const membership = memberships.find(
      (entry) => entry.roomId === room.id && entry.userId === session.userId
    );
    const participants = getRoomParticipantNames(messages, room.id, displayMap);
    return { ...room, membership, participants };
  });

  const pendingRooms = session.isAdmin ? await listPendingChatRooms() : [];

  return NextResponse.json({ rooms: enrichedRooms, pendingRooms });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { bookId, name } = await request.json();
  const book = await getBookById(bookId);

  const blocked = rejectInvalidContentForUser([name], {
    userId: session.userId,
    source: "chat_room",
    bookId,
    bookTitle: book?.title,
    fieldLabel: "이야기뜰 이름",
    preview: name,
  });
  if (blocked) return blocked;

  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const room = {
    id: uuid(),
    bookId,
    bookTitle: book.title,
    creatorId: session.userId,
    name: name || `${book.title} 이야기뜰`,
    status: "approved" as const,
    createdAt: now,
  };

  await createChatRoomWithMembership({
    room,
    membership: {
      id: uuid(),
      roomId: room.id,
      userId: session.userId,
      status: "approved",
      createdAt: now,
    },
  });

  return NextResponse.json({ room });
}
