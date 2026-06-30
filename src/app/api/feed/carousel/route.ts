import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCarouselFeed, buildPersonalMoments } from "@/lib/feed";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import type { Database } from "@/lib/types";

export async function GET() {
  const db = (await loadFeedDatabase()) as Database;
  const session = await getSession();
  const excludeUserId = session.userId || undefined;

  let items = buildCarouselFeed(db, excludeUserId);
  if (items.length === 0 && excludeUserId) {
    items = buildCarouselFeed(db);
  }
  const personalMoments = session.userId ? buildPersonalMoments(db, session.userId) : [];

  return NextResponse.json({ items, personalMoments });
}
