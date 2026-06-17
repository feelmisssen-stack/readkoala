import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";

export async function GET() {
  const db = readDb();
  const sentences = db.sharedSentences
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  return NextResponse.json({ sentences });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { word, sentence } = await request.json();
  const check = validateContent(sentence, word);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 });
  }

  const entry = {
    id: uuid(),
    userId: session.userId,
    username: session.username || "친구",
    word: word.trim(),
    sentence: sentence.trim(),
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.sharedSentences.push(entry);
  });

  return NextResponse.json({ entry });
}
