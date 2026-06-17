import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { buildRandomFeed, pickRandomItem } from "@/lib/feed";

export async function GET() {
  const db = readDb();
  const items = buildRandomFeed(db);
  const item = pickRandomItem(items);
  return NextResponse.json({ item });
}
