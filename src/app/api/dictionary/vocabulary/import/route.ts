import { NextResponse } from "next/server";
import { importVocabularyEntries } from "@/lib/repositories/vocabulary-repository";
import { getSession } from "@/lib/session";
import type { VocabularyEntry } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const entries = Array.isArray(body.entries) ? (body.entries as VocabularyEntry[]) : [];

  if (entries.length === 0) {
    return NextResponse.json({ vocabulary: [] });
  }

  const vocabulary = await importVocabularyEntries(session.userId, entries);
  return NextResponse.json({ vocabulary, imported: vocabulary.length });
}
