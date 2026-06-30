import { NextResponse } from "next/server";
import { buildRandomFeed, pickRandomItem } from "@/lib/feed";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import type { Database } from "@/lib/types";

export async function GET() {
  const db = await loadFeedDatabase();
  const items = buildRandomFeed(db as Database);
  const item = pickRandomItem(items);
  return NextResponse.json({ item });
}
