import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resolveUserBySession } from "@/lib/users/resolve-user";

export async function GET() {
  const session = await getSession();
  if (!session.userId && !session.firebaseUid) {
    return NextResponse.json({ user: null });
  }

  const user = await resolveUserBySession({
    userId: session.userId,
    firebaseUid: session.firebaseUid,
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      stats: user.stats,
    },
  });
}
