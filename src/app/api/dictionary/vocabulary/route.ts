import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rejectInvalidContent } from "@/lib/content-filter-api";
import { buildVocabSenseMap } from "@/lib/vocabulary-display";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const vocabulary = db.vocabulary
    .filter((v) => v.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const senseMap = buildVocabSenseMap(vocabulary);
  const enriched = vocabulary.map((entry) => {
    const sense = senseMap.get(entry.id);
    return {
      ...entry,
      ...(sense?.showSenseNo ? { displaySenseNo: sense.senseNo } : {}),
    };
  });

  return NextResponse.json({ vocabulary: enriched });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { word, definition, senseNo } = await request.json();
  if (!word?.trim()) {
    return NextResponse.json({ error: "단어를 입력해 주세요." }, { status: 400 });
  }

  const blocked = rejectInvalidContent(word, definition);
  if (blocked) return blocked;

  const db = readDb();
  const trimmedDef = definition || "";
  const exists = db.vocabulary.some(
    (v) =>
      v.userId === session.userId &&
      v.word === word.trim() &&
      v.definition === trimmedDef
  );
  if (exists) {
    return NextResponse.json({ error: "이미 낱말집에 있는 뜻이에요." }, { status: 400 });
  }

  const parsedSenseNo = Number(senseNo);
  const entry = {
    id: uuid(),
    userId: session.userId,
    word: word.trim(),
    definition: trimmedDef,
    ...(parsedSenseNo > 0 ? { senseNo: parsedSenseNo } : {}),
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.vocabulary.push(entry);
  });

  return NextResponse.json({ entry });
}
