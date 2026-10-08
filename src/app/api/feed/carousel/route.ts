import { NextResponse } from "next/server";
import { buildCarouselFeed, groupCarouselFeed } from "@/lib/feed";
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
  const requestedPage = parsePage(new URL(request.url).searchParams.get("page"));

  const source = await loadHomeFeedSource();
  const entries = groupCarouselFeed(buildCarouselFeed(source));

  const totalPages = Math.max(1, Math.ceil(entries.length / HOME_FEED_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageEntries = entries.slice((page - 1) * HOME_FEED_PAGE_SIZE, page * HOME_FEED_PAGE_SIZE);

  const names = buildUserDisplayMap(
    await listUsersForIds(pageEntries.flatMap((entry) => entry.readers.map((reader) => reader.userId)))
  );
  const items: CarouselFeedItem[] = pageEntries.map(({ userId: ownerId, readers, ...entry }) => ({
    ...entry,
    username: names.get(ownerId) || "친구",
    readers: readers.map(({ userId, ...reader }) => ({
      ...reader,
      username: names.get(userId) || "친구",
    })),
  }));

  return NextResponse.json({ items, page, totalPages, totalCount: entries.length });
}
