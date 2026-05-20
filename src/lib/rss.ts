import "server-only";

import { getFeedConfigPath } from "@/lib/feed-config";
import { syncFeedsBatch } from "@/lib/feed-sync";
import type { FeedEntry, FeedSyncResult } from "@/lib/feed-sync-types";

export type { FeedEntry };
export type FeedResult = FeedSyncResult;

export async function loadFeedResults() {
  const { results, fetchedAt } = await syncFeedsBatch();

  return {
    results,
    configPath: getFeedConfigPath(),
    fetchedAt,
  };
}
