import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import {
  importVocabularyEntries,
  listVocabularyByUserId,
} from "@/lib/repositories/vocabulary-repository";
import { getSession } from "@/lib/session";
import type { VocabularyEntry } from "@/lib/types";

export const runtime = "nodejs";

/** db.json 에 남아 있는 낱말집을 Firestore 로 한 번 옮길 때 사용 */
export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await listVocabularyByUserId(session.userId);
  if (existing.length > 0) {
    return NextResponse.json({ vocabulary: existing, alreadyMigrated: true });
  }

  const db = readDb();
  const legacy = db.vocabulary
    .filter((entry) => entry.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (legacy.length === 0) {
    return NextResponse.json({ vocabulary: [] });
  }

  const vocabulary = await importVocabularyEntries(
    session.userId,
    legacy as VocabularyEntry[]
  );

  return NextResponse.json({ vocabulary, migratedFromLegacy: true });
}
