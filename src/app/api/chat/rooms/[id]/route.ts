import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAppAdminSession } from "@/lib/admin-auth";
import { deleteChatRoom } from "@/lib/repositories/chat-repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || !isAppAdminSession(session)) {
    return NextResponse.json({ error: "관리자만 이야기뜰을 지울 수 있어요." }, { status: 403 });
  }

  const { id } = await params;
  if (!(await deleteChatRoom(id))) {
    return NextResponse.json({ error: "이야기뜰을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
