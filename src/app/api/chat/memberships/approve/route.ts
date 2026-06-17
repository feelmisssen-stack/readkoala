import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateLevel } from "@/lib/gamification";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId || !session.isAdmin) {
    return NextResponse.json({ error: "관리자만 승인할 수 있어요." }, { status: 403 });
  }

  const { membershipId, action } = await request.json();

  updateDb((db) => {
    const membership = db.chatMemberships.find((m) => m.id === membershipId);
    if (membership) {
      membership.status = action === "approve" ? "approved" : "rejected";
      if (action === "approve") {
        const user = db.users.find((u) => u.id === membership.userId);
        if (user) {
          user.stats.chatParticipations += 1;
          user.stats.level = calculateLevel(user.stats);
        }
      }
    }
  });

  return NextResponse.json({ ok: true });
}
