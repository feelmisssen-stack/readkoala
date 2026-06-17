import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { quizId, answer } = await request.json();
  const db = readDb();
  const word = db.vocabulary.find((v) => v.id === quizId && v.userId === session.userId);
  if (!word) {
    return NextResponse.json({ correct: false });
  }

  return NextResponse.json({ correct: word.word === answer?.trim() });
}
