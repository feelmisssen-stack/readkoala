import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { VocabularyEntry } from "@/lib/types";

/** db.json 에 남아 있는 낱말집을 브라우저 localStorage 로 한 번 옮길 때만 사용 */
export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const vocabulary = db.vocabulary
    .filter((entry) => entry.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ vocabulary: vocabulary as VocabularyEntry[] });
}
