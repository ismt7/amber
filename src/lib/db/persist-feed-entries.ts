import "server-only";

import { sql } from "drizzle-orm";

import { ensureDatabase, getDatabase, isDatabaseConfigured } from "./client";
import { feedEntries, type InsertFeedEntry } from "./schema";
import type { FeedEntry } from "@/lib/feed-sync-types";

export async function persistFeedEntries(feedId: string, entries: FeedEntry[]) {
  if (entries.length === 0) {
    return;
  }

  if (!isDatabaseConfigured()) {
    return;
  }

  await ensureDatabase();

  const fetchedAt = new Date().toISOString();
  const rows: InsertFeedEntry[] = entries.map((entry) => ({
    feedId,
    link: entry.link,
    title: entry.title,
    publishedAt: entry.publishedAt,
    summary: entry.summary,
    fetchedAt,
  }));

  await getDatabase()
    .insert(feedEntries)
    .values(rows)
    .onConflictDoUpdate({
      target: [feedEntries.feedId, feedEntries.link],
      set: {
        title: sql`excluded.title`,
        publishedAt: sql`excluded.published_at`,
        summary: sql`excluded.summary`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
}
