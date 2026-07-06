import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureGoogleAdminLinkedInSession } from "@/lib/users/admin-app-bridge";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  await ensureGoogleAdminLinkedInSession(session);

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

  const { applyReadOnlyToSession } = await import("@/lib/read-only-access");
  const { getFirestoreUser } = await import("@/lib/users/firestore-user");
  if (session.firebaseUid) {
    const profile = await getFirestoreUser(session.firebaseUid);
    if (profile) {
      applyReadOnlyToSession(session, profile);
      await session.save();
    }
  }

  let stageLevel = 1;
  try {
    const { loadWritingGrowthDatabase } = await import("@/lib/repositories/feed-data");
    const { getUserWritingGrowthFromEntries } = await import("@/lib/writing-growth");
    const growthData = await loadWritingGrowthDatabase(user.id);
    const writingGrowth = getUserWritingGrowthFromEntries(
      growthData.reflections,
      growthData.sharedSentences,
      user.id
    );
    stageLevel = writingGrowth.stageLevel;
  } catch (error) {
    console.error("[auth/me] growth load failed:", error);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      readOnly: session.readOnly ?? false,
      stats: user.stats,
      stageLevel,
    },
  });
}
