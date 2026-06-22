import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getInitialConsonant } from "@/lib/dictionary-api";

function normalizeQuizWord(input: string): string {
  return input.trim().replaceAll("-", "").replaceAll(" ", "");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const excludeId = searchParams.get("exclude");

  const db = readDb();
  const words = db.vocabulary.filter((v) => v.userId === session.userId);
  if (words.length === 0) {
    return NextResponse.json({
      quiz: null,
      message: "낱말집에 단어를 먼저 추가해 주세요.",
    });
  }

  let pool = words;
  const excludeIds = excludeId
    ? excludeId.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  if (excludeIds.length > 0) {
    const filtered = words.filter((v) => !excludeIds.includes(v.id));
    if (filtered.length > 0) {
      pool = filtered;
    } else if (excludeIds.length >= words.length) {
      return NextResponse.json({
        quiz: null,
        completed: true,
        message: "모든 낱말을 맞혔어요!",
      });
    }
  }

  const word = pool[Math.floor(Math.random() * pool.length)];
  const normalized = normalizeQuizWord(word.word);
  const hint = getInitialConsonant(normalized);

  return NextResponse.json({
    quiz: {
      id: word.id,
      hint,
      definition: word.definition,
      answerLength: normalized.length,
    },
  });
}
