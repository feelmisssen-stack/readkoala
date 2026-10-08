import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import {
  adminDeleteKoalaAvatar,
  listAppliedKoalaAvatars,
} from "@/lib/repositories/koala-repository";
import { listFirestoreUsers, resolveEffectiveUserId } from "@/lib/users/firestore-user";

export const runtime = "nodejs";

async function ensureAdmin() {
  try {
    await requireGoogleAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }
}

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const [avatars, profiles] = await Promise.all([listAppliedKoalaAvatars(), listFirestoreUsers()]);
  const usersById = new Map(
    profiles.map((profile) => [resolveEffectiveUserId(profile, profile.id), profile])
  );

  const koalas = avatars
    .map((avatar) => {
      const user = usersById.get(avatar.userId);
      return {
        id: avatar.id,
        userId: avatar.userId,
        username: user?.username ?? "알 수 없음",
        nickname: user?.nickname?.trim() || user?.username || "친구",
        name: avatar.name,
        prompt: avatar.prompt,
        imageUrl: avatar.status === "deleted" ? null : avatar.imageUrl,
        status: avatar.status,
        createdAt: avatar.createdAt,
        appliedAt: avatar.appliedAt ?? null,
        deletedAt: avatar.deletedAt ?? null,
      };
    })
    .sort((a, b) => (b.appliedAt ?? b.createdAt).localeCompare(a.appliedAt ?? a.createdAt));

  return NextResponse.json({ koalas });
}

export async function DELETE(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { avatarId } = (await request.json().catch(() => ({}))) as { avatarId?: string };
  if (!avatarId) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  if (!(await adminDeleteKoalaAvatar(avatarId))) {
    return NextResponse.json({ error: "코알라를 찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
