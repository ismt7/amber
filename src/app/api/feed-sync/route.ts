import { runFeedSyncJobAsResponse } from "@/lib/feed-sync-response";

export const runtime = "nodejs";

export async function POST() {
  return runFeedSyncJobAsResponse("manual-ui");
}
