import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const vocabulary = db.vocabulary
    .filter((v) => v.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ vocabulary });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { word, definition } = await request.json();
  if (!word?.trim()) {
    return NextResponse.json({ error: "단어를 입력해 주세요." }, { status: 400 });
  }

  const db = readDb();
  const exists = db.vocabulary.some(
    (v) => v.userId === session.userId && v.word === word.trim()
  );
  if (exists) {
    return NextResponse.json({ error: "이미 낱말집에 있어요." }, { status: 400 });
  }

  const entry = {
    id: uuid(),
    userId: session.userId,
    word: word.trim(),
    definition: definition || "",
    createdAt: new Date().toISOString(),
  };

  updateDb((d) => {
    d.vocabulary.push(entry);
  });

  return NextResponse.json({ entry });
}
