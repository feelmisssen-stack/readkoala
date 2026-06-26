import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateLevel } from "@/lib/gamification";
import { getDisplayName } from "@/lib/user-display";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ user: null });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const level = calculateLevel(user.stats);
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      displayName: getDisplayName(user),
      isAdmin: user.isAdmin,
      stats: { ...user.stats, level },
    },
  });
}
