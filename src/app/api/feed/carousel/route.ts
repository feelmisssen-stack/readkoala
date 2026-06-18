import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readDb } from "@/lib/db";
import { buildCarouselFeed, buildPersonalMoments } from "@/lib/feed";

export async function GET() {
  const db = readDb();
  const session = await getSession();
  const excludeUserId = session.userId || undefined;

  let items = buildCarouselFeed(db, excludeUserId);
  if (items.length === 0 && excludeUserId) {
    items = buildCarouselFeed(db);
  }
  const personalMoments = session.userId
    ? buildPersonalMoments(db, session.userId)
    : [];

  return NextResponse.json({ items, personalMoments });
}
