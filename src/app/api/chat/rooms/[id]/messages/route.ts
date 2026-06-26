import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";
import { CHAT_MESSAGE_LIMIT_PER_USER, countUserMessagesInRoom, ensureApprovedMembership } from "@/lib/chat";
import { buildUserDisplayMap, getDisplayName } from "@/lib/user-display";
import { v4 as uuid } from "uuid";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const room = readDb().chatRooms.find((r) => r.id === id && r.status === "approved");
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  updateDb((d) => {
    ensureApprovedMembership(d, id, session.userId!);
  });

  const db = readDb();
  const displayMap = buildUserDisplayMap(db.users);
  const messages = db.chatMessages
    .filter((m) => m.roomId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => ({
      ...m,
      username: displayMap.get(m.userId) || m.username,
    }));

  const myMessageCount = countUserMessagesInRoom(db.chatMessages, id, session.userId);

  const currentUser = db.users.find((u) => u.id === session.userId);

  return NextResponse.json({
    messages,
    currentUserId: session.userId,
    currentUsername: currentUser
      ? currentUser.nickname?.trim() || currentUser.username
      : session.username ?? null,
    myMessageCount,
    messageLimit: CHAT_MESSAGE_LIMIT_PER_USER,
  });
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
  const room = db.chatRooms.find((r) => r.id === id && r.status === "approved");
  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  updateDb((d) => {
    ensureApprovedMembership(d, id, session.userId!);
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
