import { NextResponse } from "next/server";
import {
  getQuizSolvedIds,
  saveQuizSolvedIds,
} from "@/lib/repositories/vocabulary-quiz-progress-repository";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const solvedIds = await getQuizSolvedIds(session.userId);
  return NextResponse.json({ solvedIds });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const solvedIds = Array.isArray(body.solvedIds)
    ? body.solvedIds.map(String)
    : [];

  await saveQuizSolvedIds(session.userId, solvedIds);
  return NextResponse.json({ ok: true, solvedIds });
}
