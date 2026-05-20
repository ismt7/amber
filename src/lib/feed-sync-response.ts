import { FeedSyncAlreadyRunningError, runFeedSyncJob } from "@/lib/feed-sync-job";

export async function runFeedSyncJobAsResponse(source: string) {
  try {
    const summary = await runFeedSyncJob(source);
    return Response.json(summary);
  } catch (error) {
    if (error instanceof FeedSyncAlreadyRunningError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    console.error("[feed-sync] batch endpoint failed", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return Response.json({ error: message }, { status: 500 });
  }
}
