import "server-only";

import { getFeedConfigPath } from "@/lib/feed-config";
import { syncFeedsBatch, type FeedEntry, type FeedSyncResult } from "@/lib/feed-sync";

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
