export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startInAppFeedSyncScheduler } = await import("@/lib/in-app-feed-sync-scheduler");
  startInAppFeedSyncScheduler();
}
