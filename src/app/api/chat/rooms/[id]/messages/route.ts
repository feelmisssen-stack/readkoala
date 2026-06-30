import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/session";
import { rejectInvalidContentForUser } from "@/lib/content-filter-api";
import {
  CHAT_MESSAGE_LIMIT_PER_USER,
  CHAT_SPEAKER_LIMIT,
  canUserChatInRoom,
  countUserMessagesInRoom,
  getMessageHeartCounts,
  getRoomSpeakerIds,
} from "@/lib/chat";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import { resolveUserBySession } from "@/lib/users/resolve-user";
import {
  approveChatRoomIfPending,
  createChatMessage,
  ensureApprovedChatMembership,
  getChatRoomById,
  listChatHeartsByRoom,
  listChatMessagesByRoom,
} from "@/lib/repositories/chat-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const room = await getChatRoomById(id);
  if (!room || (room.status !== "approved" && room.status !== "pending")) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  await ensureApprovedChatMembership(id, session.userId, session.firebaseUid);
  await approveChatRoomIfPending(id);

  const [roomMessages, hearts, feedData, currentUser] = await Promise.all([
    listChatMessagesByRoom(id),
    listChatHeartsByRoom(id),
    loadFeedDatabase(),
    resolveUserBySession({ userId: session.userId, firebaseUid: session.firebaseUid }),
  ]);

  const displayMap = new Map(feedData.users.map((user) => [user.id, user.nickname?.trim() || user.username]));
  const messageIds = roomMessages.map((message) => message.id);
  const heartCounts = getMessageHeartCounts(hearts, messageIds);
  const myHearts = new Set(
    hearts.filter((heart) => heart.userId === session.userId).map((heart) => heart.messageId)
  );

  const messages = roomMessages.map((message) => ({
    ...message,
    username: displayMap.get(message.userId) || message.username,
    heartCount: heartCounts.get(message.id) || 0,
    heartedByMe: myHearts.has(message.id),
  }));

  const myMessageCount = countUserMessagesInRoom(roomMessages, id, session.userId);
  const speakers = getRoomSpeakerIds(roomMessages, id);
  const canChat = canUserChatInRoom(roomMessages, id, session.userId);

  return NextResponse.json({
    messages,
    room: {
      name: room.name,
      bookTitle: room.bookTitle,
    },
    currentUserId: session.userId,
    currentUsername: currentUser?.displayName || session.username || null,
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

  const room = await getChatRoomById(id);
  if (!room || (room.status !== "approved" && room.status !== "pending")) {
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

  const roomMessages = await listChatMessagesByRoom(id);
  if (!canUserChatInRoom(roomMessages, id, session.userId)) {
    return NextResponse.json(
      {
        error: `이 이야기뜰에서는 이미 ${CHAT_SPEAKER_LIMIT}명이 대화 중이에요. 들어는 볼 수 있지만 글은 남길 수 없어요.`,
      },
      { status: 403 }
    );
  }

  await ensureApprovedChatMembership(id, session.userId, session.firebaseUid);
  await approveChatRoomIfPending(id);

  const myMessageCount = countUserMessagesInRoom(roomMessages, id, session.userId);
  if (myMessageCount >= CHAT_MESSAGE_LIMIT_PER_USER) {
    return NextResponse.json(
      { error: `이 이야기뜰에는 최대 ${CHAT_MESSAGE_LIMIT_PER_USER}번까지만 글을 남길 수 있어요.` },
      { status: 400 }
    );
  }

  const author = await resolveUserBySession({
    userId: session.userId,
    firebaseUid: session.firebaseUid,
  });

  const message = await createChatMessage({
    id: uuid(),
    roomId: id,
    userId: session.userId,
    username: author?.displayName || session.username || "친구",
    content,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ message });
}
