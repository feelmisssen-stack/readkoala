import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getInitialConsonant } from "@/lib/dictionary-api";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const words = db.vocabulary.filter((v) => v.userId === session.userId);
  if (words.length === 0) {
    return NextResponse.json({
      quiz: null,
      message: "낱말집에 단어를 먼저 추가해 주세요.",
    });
  }

  const word = words[Math.floor(Math.random() * words.length)];
  const hint = getInitialConsonant(word.word);

  return NextResponse.json({
    quiz: {
      id: word.id,
      hint,
      definition: word.definition,
      answerLength: word.word.length,
    },
  });
}
