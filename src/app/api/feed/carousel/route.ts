import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCarouselFeed } from "@/lib/feed";
import {
  HOME_FEED_PAGE_SIZE,
  listUsersForIds,
  loadHomeFeedSource,
} from "@/lib/repositories/feed-data";
import type { CarouselFeedItem } from "@/lib/types";
import { buildUserDisplayMap } from "@/lib/user-display";

export const runtime = "nodejs";

function parsePage(value: string | null) {
  const page = Math.floor(Number(value ?? 1));
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export async function GET(request: Request) {
  const session = await getSession();
  const userId = session.userId || undefined;
  const requestedPage = parsePage(new URL(request.url).searchParams.get("page"));

  const source = await loadHomeFeedSource();
  let entries = buildCarouselFeed(source, userId);
  if (entries.length === 0 && userId) {
    entries = buildCarouselFeed(source);
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / HOME_FEED_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageEntries = entries.slice((page - 1) * HOME_FEED_PAGE_SIZE, page * HOME_FEED_PAGE_SIZE);

  const names = buildUserDisplayMap(await listUsersForIds(pageEntries.map((entry) => entry.userId)));
  const items: CarouselFeedItem[] = pageEntries.map(({ userId: ownerId, ...entry }) => ({
    ...entry,
    username: names.get(ownerId) || "친구",
  }));

  return NextResponse.json({ items, page, totalPages, totalCount: entries.length });
}
