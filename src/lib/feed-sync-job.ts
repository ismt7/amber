import { sql } from "drizzle-orm";

import { syncFeedsBatch } from "@/lib/feed-sync";
import { DatabaseNotConfiguredError, ensureDatabase, getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import type { FeedSyncSummary } from "@/lib/feed-sync-types";

const FEED_SYNC_ADVISORY_LOCK_KEY = 934857120394857;

export class FeedSyncAlreadyRunningError extends Error {
  constructor() {
    super("Feed sync is already running.");
    this.name = "FeedSyncAlreadyRunningError";
  }
}

export async function runFeedSyncJob(source: string): Promise<FeedSyncSummary> {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }

  await ensureDatabase();

  const lockAcquired = await tryAcquireLock();
  if (!lockAcquired) {
    throw new FeedSyncAlreadyRunningError();
  }

  const startedAt = new Date().toISOString();
  console.info("[feed-sync] started", { source, startedAt });

  try {
    const summary = await syncFeedsBatch();
    console.info("[feed-sync] finished", {
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      totals: summary.totals,
      failures: summary.failures.length,
    });

    return summary;
  } finally {
    await releaseLock();
  }
}

async function tryAcquireLock() {
  const rows = await getDatabase().execute(sql`
    SELECT pg_try_advisory_lock(${FEED_SYNC_ADVISORY_LOCK_KEY}) AS locked
  `);

  return rows[0]?.locked === true;
}

async function releaseLock() {
  await getDatabase().execute(sql`
    SELECT pg_advisory_unlock(${FEED_SYNC_ADVISORY_LOCK_KEY})
  `);
}
