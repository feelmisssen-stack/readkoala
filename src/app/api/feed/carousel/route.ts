import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCarouselFeed, buildPersonalMoments } from "@/lib/feed";
import {
  CAROUSEL_FEED_LIMIT,
  loadCarouselFeedDatabase,
  loadPersonalCarouselDatabase,
} from "@/lib/repositories/feed-data";
import type { Database } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const userId = session.userId || undefined;

  const db = (await loadCarouselFeedDatabase(userId)) as Database;

  let items = buildCarouselFeed(db, userId);
  if (items.length === 0 && userId) {
    items = buildCarouselFeed(db);
  }
  items = items.slice(0, CAROUSEL_FEED_LIMIT);

  const personalMoments = userId
    ? buildPersonalMoments((await loadPersonalCarouselDatabase(userId)) as Database, userId)
    : [];

  return NextResponse.json({ items, personalMoments });
}
