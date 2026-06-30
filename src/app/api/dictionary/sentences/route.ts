import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rejectInvalidContentForUser } from "@/lib/content-filter-api";
import { buildUserDisplayMap } from "@/lib/user-display";
import { resolveUserBySession } from "@/lib/users/resolve-user";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import {
  createSharedSentence,
  listAllSharedSentences,
} from "@/lib/repositories/shared-sentences-repository";

export async function GET() {
  const [sentences, feedData] = await Promise.all([listAllSharedSentences(), loadFeedDatabase()]);
  const displayMap = buildUserDisplayMap(feedData.users);

  const enriched = sentences.map((sentence) => ({
    ...sentence,
    username: displayMap.get(sentence.userId) || sentence.username,
    definition: sentence.definition || "",
  }));

  return NextResponse.json({ sentences: enriched });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { vocabularyId, sentence, word, definition, senseNo } = await request.json();
  if (!word?.trim()) {
    return NextResponse.json({ error: "낱말을 골라 주세요." }, { status: 400 });
  }
  if (!sentence?.trim()) {
    return NextResponse.json({ error: "문장을 입력해 주세요." }, { status: 400 });
  }

  const blocked = rejectInvalidContentForUser([sentence], {
    userId: session.userId,
    source: "shared_sentence",
    fieldLabel: "낱말 문장",
    preview: sentence,
  });
  if (blocked) return blocked;

  const user = await resolveUserBySession({
    userId: session.userId,
    firebaseUid: session.firebaseUid,
  });
  const displayName = user?.displayName || session.username || "친구";
  const parsedSenseNo = Number(senseNo);

  const entry = await createSharedSentence({
    userId: session.userId,
    username: displayName,
    vocabularyId: typeof vocabularyId === "string" ? vocabularyId : undefined,
    word: word.trim(),
    definition: definition?.trim() || "",
    ...(parsedSenseNo > 0 ? { senseNo: parsedSenseNo } : {}),
    sentence: sentence.trim(),
  });

  return NextResponse.json({ entry });
}
