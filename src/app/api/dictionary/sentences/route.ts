import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rejectInvalidContentForUser } from "@/lib/content-filter-api";
import { buildUserDisplayMap } from "@/lib/user-display";
import { buildVocabSenseMap, resolveVocabSense } from "@/lib/vocabulary-display";

export async function GET() {
  const db = readDb();
  const displayMap = buildUserDisplayMap(db.users);
  const sentences = db.sharedSentences
    .map((s) => ({
      ...s,
      username: displayMap.get(s.userId) || s.username,
      definition: s.definition || "",
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ sentences });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { vocabularyId, sentence } = await request.json();
  const blocked = rejectInvalidContentForUser([sentence], {
    userId: session.userId,
    source: "shared_sentence",
    fieldLabel: "낱말 문장",
    preview: sentence,
  });
  if (blocked) return blocked;

  const db = readDb();
  const vocab = db.vocabulary.find((v) => v.id === vocabularyId && v.userId === session.userId);
  if (!vocab) {
    return NextResponse.json({ error: "낱말집에서 낱말을 골라 주세요." }, { status: 400 });
  }

  const user = db.users.find((u) => u.id === session.userId);
  const displayName = user ? user.nickname?.trim() || user.username : session.username || "친구";

  const userVocab = db.vocabulary.filter((v) => v.userId === session.userId);
  const senseMap = buildVocabSenseMap(userVocab);
  const sense = resolveVocabSense(vocab, userVocab, senseMap);

  const entry = {
    id: uuid(),
    userId: session.userId,
    username: displayName,
    vocabularyId: vocab.id,
    word: vocab.word,
    definition: vocab.definition,
    ...(sense.showSenseNo ? { senseNo: sense.senseNo } : vocab.senseNo ? { senseNo: vocab.senseNo } : {}),
    sentence: sentence.trim(),
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.sharedSentences.push(entry);
  });

  return NextResponse.json({ entry });
}
