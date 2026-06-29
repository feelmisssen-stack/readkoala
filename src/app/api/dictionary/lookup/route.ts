import { NextResponse } from "next/server";
import { lookupWord } from "@/lib/dictionary-api";
import { rejectInvalidContent } from "@/lib/content-filter-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word");
  if (!word) {
    return NextResponse.json({ error: "단어를 입력해 주세요." }, { status: 400 });
  }

  const blocked = rejectInvalidContent(word);
  if (blocked) return blocked;

  const result = await lookupWord(word);
  return NextResponse.json({ result });
}
