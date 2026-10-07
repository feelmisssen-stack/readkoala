import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { rejectInvalidContent, rejectInvalidNickname } from "@/lib/content-filter-api";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { listAllBooks } from "@/lib/repositories/books-repository";
import { listAllReflections } from "@/lib/repositories/reflections-repository";
import { listAllSharedSentences } from "@/lib/repositories/shared-sentences-repository";
import {
  createFirestoreUser,
  listFirestoreUsers,
  resolveEffectiveUserId,
} from "@/lib/users/firestore-user";
import { getUserWritingGrowthFromEntries } from "@/lib/writing-growth";

function groupByUserId<T extends { userId: string }>(entries: T[]) {
  const grouped = new Map<string, T[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.userId);
    if (list) list.push(entry);
    else grouped.set(entry.userId, [entry]);
  }
  return grouped;
}

function latestDate(values: (string | undefined)[]) {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time) && time > latestTime) {
      latest = value;
      latestTime = time;
    }
  }
  return latest;
}

const FIREBASE_REQUIRED_MESSAGE =
  "Firebase 설정이 필요해요. .env.local의 NEXT_PUBLIC_FIREBASE_*와 FIREBASE_ADMIN_*를 확인해 주세요.";

export async function GET() {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: FIREBASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const [profiles, books, reflections, sharedSentences] = await Promise.all([
    listFirestoreUsers(),
    listAllBooks(),
    listAllReflections(),
    listAllSharedSentences(),
  ]);

  const booksByUser = groupByUserId(books);
  const reflectionsByUser = groupByUserId(reflections);
  const sentencesByUser = groupByUserId(sharedSentences);

  const users = profiles.map((profile) => {
    const effectiveId = resolveEffectiveUserId(profile, profile.id);
    const userBooks = booksByUser.get(effectiveId) ?? [];
    const userReflections = reflectionsByUser.get(effectiveId) ?? [];
    const growth = getUserWritingGrowthFromEntries(
      userReflections,
      sentencesByUser.get(effectiveId) ?? [],
      effectiveId
    );
    return {
      id: effectiveId,
      firebaseUid: profile.id,
      username: profile.username,
      nickname: profile.nickname,
      isAdmin: profile.isAdmin,
      createdAt: profile.createdAt,
      lastSeenAt: profile.lastSeenAt ?? null,
      lastActivityAt: latestDate([
        ...userBooks.map((book) => book.createdAt),
        ...userReflections.map((reflection) => reflection.updatedAt ?? reflection.createdAt),
      ]),
      bookCount: userBooks.length,
      reflectionCount: userReflections.length,
      leafCount: growth.leafCount,
      stageLevel: growth.stageLevel,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: FIREBASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const { username, password, nickname } = await request.json();
  const trimmedUsername = username?.trim();

  if (!trimmedUsername || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 해요." }, { status: 400 });
  }

  const blockedUsername = rejectInvalidContent(trimmedUsername);
  if (blockedUsername) return blockedUsername;

  const trimmedNickname = nickname?.trim();
  if (trimmedNickname) {
    const blockedNickname = rejectInvalidNickname(trimmedNickname);
    if (blockedNickname) return blockedNickname;
  }

  try {
    const { uid, profile } = await createFirestoreUser({
      username: trimmedUsername,
      password,
      nickname: trimmedNickname,
    });

    const effectiveId = resolveEffectiveUserId(profile, uid);
    return NextResponse.json({
      user: {
        id: effectiveId,
        firebaseUid: uid,
        username: profile.username,
        nickname: profile.nickname,
        createdAt: profile.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "회원 생성에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
