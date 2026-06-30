import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getChatRoomById,
  listChatMessagesByRoom,
  toggleChatMessageHeart,
} from "@/lib/repositories/chat-repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id, messageId } = await params;
  const room = await getChatRoomById(id);
  if (!room || (room.status !== "approved" && room.status !== "pending")) {
    return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  }

  const message = (await listChatMessagesByRoom(id)).find((entry) => entry.id === messageId);
  if (!message) {
    return NextResponse.json({ error: "메시지를 찾을 수 없어요." }, { status: 404 });
  }

  if (message.userId === session.userId) {
    return NextResponse.json({ error: "내 메시지에는 호응을 남길 수 없어요." }, { status: 400 });
  }

  const { hearted, heartCount } = await toggleChatMessageHeart({
    roomId: id,
    messageId,
    userId: session.userId,
  });

  return NextResponse.json({ ok: true, hearted, heartCount });
}
