import { NextResponse } from "next/server";
import { getDisplayNameOptions } from "@/lib/admin-auth";
import { buildRandomFeed, pickRandomItem } from "@/lib/feed";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import type { Database } from "@/lib/types";

export async function GET() {
  const [db, nameOptions] = await Promise.all([loadFeedDatabase(), getDisplayNameOptions()]);
  const items = buildRandomFeed(db as Database, nameOptions);
  const item = pickRandomItem(items);
  return NextResponse.json({ item });
}
