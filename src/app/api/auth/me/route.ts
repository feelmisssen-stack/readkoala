import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();

  if (session.googleAdminEmail && !session.userId) {
    try {
      const { applyGoogleAdminAppSession } = await import("@/lib/users/admin-app-bridge");
      const linked = await Promise.race([
        applyGoogleAdminAppSession(
          session,
          session.googleAdminEmail,
          session.googleAdminName
        ),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 8000);
        }),
      ]);
      if (linked) {
        await session.save();
      }
    } catch {
      // 관리자 Google 세션은 /api/admin/me 에서 별도 확인
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

  const { applyReadOnlyToSession } = await import("@/lib/read-only-access");
  const { getFirestoreUser } = await import("@/lib/users/firestore-user");
  if (session.firebaseUid) {
    const profile = await getFirestoreUser(session.firebaseUid);
    if (profile) {
      applyReadOnlyToSession(session, profile);
      await session.save();
    }
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
      readOnly: session.readOnly ?? false,
      stats: user.stats,
      stageLevel: writingGrowth.stageLevel,
    },
  });
}
