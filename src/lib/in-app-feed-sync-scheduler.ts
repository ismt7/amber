import { FeedSyncAlreadyRunningError, runFeedSyncJob } from "@/lib/feed-sync-job";
import { isDatabaseConfigured } from "@/lib/db/client";

declare global {
  var __amberFeedSyncSchedulerStarted: boolean | undefined;
}

export function startInAppFeedSyncScheduler() {
  if (globalThis.__amberFeedSyncSchedulerStarted) {
    return;
  }

  const enabled = process.env.IN_APP_FEED_SYNC_ENABLED === "true";
  if (!enabled) {
    return;
  }

  if (!isDatabaseConfigured()) {
    console.info("[feed-sync] in-app scheduler disabled because DATABASE_URL is not configured");
    return;
  }

  const intervalSeconds = parsePositiveInt(process.env.FEED_SYNC_INTERVAL_SECONDS, 1800);
  const intervalMs = intervalSeconds * 1000;

  globalThis.__amberFeedSyncSchedulerStarted = true;

  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      await runFeedSyncJob("in-app-scheduler");
    } catch (error) {
      if (error instanceof FeedSyncAlreadyRunningError) {
        return;
      }

      console.error("[feed-sync] in-app scheduler run failed", error);
    } finally {
      running = false;
    }
  };

  console.info("[feed-sync] in-app scheduler enabled", {
    intervalSeconds,
  });

  void tick();

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  timer.unref?.();
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
