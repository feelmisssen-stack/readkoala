import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";
import { getDisplayName } from "@/lib/user-display";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { nickname, currentPassword, newPassword } = await request.json();
  const db = readDb();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return NextResponse.json({ error: "회원 정보를 찾을 수 없어요." }, { status: 404 });
  }

  const hasNickname = typeof nickname === "string";
  const hasPasswordChange = typeof newPassword === "string" && newPassword.length > 0;

  if (!hasNickname && !hasPasswordChange) {
    return NextResponse.json({ error: "변경할 내용을 입력해 주세요." }, { status: 400 });
  }

  if (hasNickname) {
    const trimmed = nickname.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "닉네임을 입력해 주세요." }, { status: 400 });
    }
    const check = validateContent(trimmed);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 400 });
    }
  }

  if (hasPasswordChange) {
    if (!currentPassword) {
      return NextResponse.json({ error: "현재 비밀번호를 입력해 주세요." }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: "새 비밀번호는 4자 이상이어야 해요." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "현재 비밀번호가 틀려요." }, { status: 400 });
    }
  }

  updateDb((d) => {
    const target = d.users.find((u) => u.id === session.userId);
    if (!target) return;
    if (hasNickname) {
      target.nickname = nickname.trim();
    }
    if (hasPasswordChange) {
      target.passwordHash = bcrypt.hashSync(newPassword, 10);
    }
  });

  const updated = readDb().users.find((u) => u.id === session.userId)!;

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      username: updated.username,
      nickname: updated.nickname,
      displayName: getDisplayName(updated),
    },
  });
}
