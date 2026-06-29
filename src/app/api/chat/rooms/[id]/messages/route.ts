import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rejectInvalidContentForUser } from "@/lib/content-filter-api";
import {
  CHAT_MESSAGE_LIMIT_PER_USER,
  CHAT_SPEAKER_LIMIT,
  canUserChatInRoom,
  countUserMessagesInRoom,
  ensureApprovedMembership,
  getMessageHeartCounts,
  getRoomSpeakerIds,
} from "@/lib/chat";
import { buildUserDisplayMap, getDisplayName } from "@/lib/user-display";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const room = readDb().chatRooms.find(
    (r) => r.id === id && (r.status === "approved" || r.status === "pending")
  );
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  updateDb((d) => {
    ensureApprovedMembership(d, id, session.userId!);
    const target = d.chatRooms.find((r) => r.id === id);
    if (target?.status === "pending") target.status = "approved";
  });

  const db = readDb();
  const displayMap = buildUserDisplayMap(db.users);
  const roomMessages = db.chatMessages
    .filter((m) => m.roomId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const messageIds = roomMessages.map((m) => m.id);
  const heartCounts = getMessageHeartCounts(db.chatMessageHearts, messageIds);
  const myHearts = new Set(
    db.chatMessageHearts
      .filter((h) => h.roomId === id && h.userId === session.userId)
      .map((h) => h.messageId)
  );

  const messages = roomMessages.map((m) => ({
    ...m,
    username: displayMap.get(m.userId) || m.username,
    heartCount: heartCounts.get(m.id) || 0,
    heartedByMe: myHearts.has(m.id),
  }));

  const myMessageCount = countUserMessagesInRoom(db.chatMessages, id, session.userId);
  const speakers = getRoomSpeakerIds(db.chatMessages, id);
  const canChat = canUserChatInRoom(db.chatMessages, id, session.userId);

  const currentUser = db.users.find((u) => u.id === session.userId);

  return NextResponse.json({
    messages,
    room: {
      name: room.name,
      bookTitle: room.bookTitle,
    },
    currentUserId: session.userId,
    currentUsername: currentUser
      ? currentUser.nickname?.trim() || currentUser.username
      : session.username ?? null,
    myMessageCount,
    messageLimit: CHAT_MESSAGE_LIMIT_PER_USER,
    canChat,
    speakerCount: speakers.length,
    speakerLimit: CHAT_SPEAKER_LIMIT,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const { content } = await request.json();

  const db = readDb();
  const room = db.chatRooms.find(
    (r) => r.id === id && (r.status === "approved" || r.status === "pending")
  );
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  const blocked = rejectInvalidContentForUser([content], {
    userId: session.userId,
    source: "chat_message",
    bookTitle: room.bookTitle,
    fieldLabel: "도란뜰 메시지",
    preview: content,
  });
  if (blocked) return blocked;

  if (!canUserChatInRoom(db.chatMessages, id, session.userId)) {
    return NextResponse.json(
      { error: `이 이야기뜰에서는 이미 ${CHAT_SPEAKER_LIMIT}명이 대화 중이에요. 들어는 볼 수 있지만 글은 남길 수 없어요.` },
      { status: 403 }
    );
  }

  updateDb((d) => {
    ensureApprovedMembership(d, id, session.userId!);
    const target = d.chatRooms.find((r) => r.id === id);
    if (target?.status === "pending") target.status = "approved";
  });

  const myMessageCount = countUserMessagesInRoom(readDb().chatMessages, id, session.userId);
  if (myMessageCount >= CHAT_MESSAGE_LIMIT_PER_USER) {
    return NextResponse.json(
      { error: `이 이야기뜰에는 최대 ${CHAT_MESSAGE_LIMIT_PER_USER}번까지만 글을 남길 수 있어요.` },
      { status: 400 }
    );
  }

  const author = db.users.find((u) => u.id === session.userId);
  const message = {
    id: uuid(),
    roomId: id,
    userId: session.userId,
    username: author ? getDisplayName(author) : session.username || "친구",
    content,
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.chatMessages.push(message);
  });

  return NextResponse.json({ message });
}
