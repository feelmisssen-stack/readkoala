import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();

  if (session.googleAdminEmail && !session.userId) {
    const { applyGoogleAdminAppSession } = await import("@/lib/users/admin-app-bridge");
    const linked = await applyGoogleAdminAppSession(
      session,
      session.googleAdminEmail,
      session.googleAdminName
    );
    if (linked) {
      await session.save();
    }
  }

  if (!session.userId && !session.firebaseUid) {
    return NextResponse.json({ user: null });
  }

  const { resolveUserBySession } = await import("@/lib/users/resolve-user");
  const user = await resolveUserBySession({
    userId: session.userId,
    firebaseUid: session.firebaseUid,
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  const { loadWritingGrowthDatabase } = await import("@/lib/repositories/feed-data");
  const { getUserWritingGrowthFromEntries } = await import("@/lib/writing-growth");
  const growthData = await loadWritingGrowthDatabase(user.id);
  const writingGrowth = getUserWritingGrowthFromEntries(
    growthData.reflections,
    growthData.sharedSentences,
    user.id
  );

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      stats: user.stats,
      stageLevel: writingGrowth.stageLevel,
    },
  });
}
