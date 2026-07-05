import { NextResponse } from "next/server";
import { rejectInvalidContentForUser } from "@/lib/content-filter-api";
import {
  createVocabularyEntry,
  listVocabularyByUserId,
} from "@/lib/repositories/vocabulary-repository";
import { getSession } from "@/lib/session";
import { normalizeDisplayWord } from "@/lib/vocabulary-display";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const vocabulary = await listVocabularyByUserId(session.userId);
  return NextResponse.json({ vocabulary });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const word = normalizeDisplayWord(typeof body.word === "string" ? body.word.trim() : "");
  const definition = typeof body.definition === "string" ? body.definition : "";
  const parsedSenseNo = Number(body.senseNo);

  if (!word) {
    return NextResponse.json({ error: "낱말을 입력해 주세요." }, { status: 400 });
  }

  const blocked = rejectInvalidContentForUser([word, definition], {
    userId: session.userId,
    source: "dictionary",
    fieldLabel: "낱말집",
    preview: word,
  });
  if (blocked) return blocked;

  try {
    const entry = await createVocabularyEntry({
      userId: session.userId,
      word,
      definition,
      ...(parsedSenseNo > 0 ? { senseNo: parsedSenseNo } : {}),
    });
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_ENTRY") {
      return NextResponse.json({ error: "이미 낱말집에 있는 뜻이에요." }, { status: 409 });
    }
    throw error;
  }
}
