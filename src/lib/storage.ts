"use client";

import { useMemo, useSyncExternalStore } from "react";

// Storage keys include :v1 so future schema changes can migrate cleanly.
const BOOKMARK_STORAGE_KEY = "amber:bookmarks:v1";
const BOOKMARK_EVENT_NAME = "amber:bookmarks:change";
const READ_STATE_STORAGE_KEY = "amber:read-state:v1";
const READ_STATE_EVENT_NAME = "amber:read-state:change";
const FEED_CACHE_STORAGE_KEY = "amber:feed-cache:v1";
const FEED_CACHE_EVENT_NAME = "amber:feed-cache:change";

export type DisplayEntry = {
  title: string;
  link: string;
  publishedAt?: string;
  summary?: string;
  matchedHighlightKeywords: string[];
  feedId: string;
  feedTitle: string;
  feedUrl: string;
  siteUrl?: string;
};

export type BookmarkMap = Record<string, DisplayEntry>;
export type ReadStateMap = Record<string, { readAt: string }>;
export type FeedCache = {
  entries: DisplayEntry[];
  cachedAt?: string;
};

export const EMPTY_BOOKMARKS: BookmarkMap = {};
export const EMPTY_READ_STATE: ReadStateMap = {};
export const EMPTY_FEED_CACHE: FeedCache = { entries: [] };

let cachedBookmarks: BookmarkMap = EMPTY_BOOKMARKS;
let cachedBookmarksRaw: string | null = null;

let cachedReadState: ReadStateMap = EMPTY_READ_STATE;
let cachedReadStateRaw: string | null = null;

let cachedFeedCache: FeedCache = EMPTY_FEED_CACHE;
let cachedFeedCacheRaw: string | null = null;

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

function readBookmarks(): BookmarkMap {
  if (typeof window === "undefined") {
    return EMPTY_BOOKMARKS;
  }

  try {
    const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);

    if (!raw) {
      cachedBookmarksRaw = null;
      cachedBookmarks = EMPTY_BOOKMARKS;
      return cachedBookmarks;
    }

    if (raw === cachedBookmarksRaw) {
      return cachedBookmarks;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      cachedBookmarksRaw = null;
      cachedBookmarks = EMPTY_BOOKMARKS;
      return cachedBookmarks;
    }

    cachedBookmarksRaw = raw;
    cachedBookmarks = Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        const entry = normalizeDisplayEntry(value);

        return entry ? [[key, entry]] : [];
      }),
    );
    return cachedBookmarks;
  } catch {
    cachedBookmarksRaw = null;
    cachedBookmarks = EMPTY_BOOKMARKS;
    return cachedBookmarks;
  }
}

export function writeBookmarks(bookmarks: BookmarkMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = JSON.stringify(bookmarks);

    if (raw === cachedBookmarksRaw) {
      return;
    }

    cachedBookmarksRaw = raw;
    cachedBookmarks = Object.keys(bookmarks).length > 0 ? bookmarks : EMPTY_BOOKMARKS;
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(BOOKMARK_EVENT_NAME));
  } catch {
    // Ignore storage write errors and keep the UI usable.
  }
}

export function clearBookmarks() {
  if (typeof window === "undefined") {
    return;
  }

  cachedBookmarksRaw = null;
  cachedBookmarks = EMPTY_BOOKMARKS;
  window.localStorage.removeItem(BOOKMARK_STORAGE_KEY);
  window.dispatchEvent(new Event(BOOKMARK_EVENT_NAME));
}

function subscribeToBookmarks(onStoreChange: () => void) {
  return subscribeToStorage(BOOKMARK_STORAGE_KEY, BOOKMARK_EVENT_NAME, onStoreChange);
}

function getServerBookmarksSnapshot(): BookmarkMap {
  return EMPTY_BOOKMARKS;
}

export function useBookmarks() {
  return useSyncExternalStore(subscribeToBookmarks, readBookmarks, getServerBookmarksSnapshot);
}

// ---------------------------------------------------------------------------
// Read state
// ---------------------------------------------------------------------------

function readReadState(): ReadStateMap {
  if (typeof window === "undefined") {
    return EMPTY_READ_STATE;
  }

  try {
    const raw = window.localStorage.getItem(READ_STATE_STORAGE_KEY);

    if (!raw) {
      cachedReadStateRaw = null;
      cachedReadState = EMPTY_READ_STATE;
      return cachedReadState;
    }

    if (raw === cachedReadStateRaw) {
      return cachedReadState;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      cachedReadStateRaw = null;
      cachedReadState = EMPTY_READ_STATE;
      return cachedReadState;
    }

    cachedReadStateRaw = raw;
    cachedReadState = Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (!value || typeof value !== "object") {
          return [];
        }

        const readAt = (value as { readAt?: unknown }).readAt;

        return typeof readAt === "string" ? [[key, { readAt }]] : [];
      }),
    );
    return cachedReadState;
  } catch {
    cachedReadStateRaw = null;
    cachedReadState = EMPTY_READ_STATE;
    return cachedReadState;
  }
}

export function writeReadState(readState: ReadStateMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = JSON.stringify(readState);

    if (raw === cachedReadStateRaw) {
      return;
    }

    cachedReadStateRaw = raw;
    cachedReadState = Object.keys(readState).length > 0 ? readState : EMPTY_READ_STATE;
    window.localStorage.setItem(READ_STATE_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(READ_STATE_EVENT_NAME));
  } catch {
    // Ignore storage write errors and keep the UI usable.
  }
}

export function markEntriesAsRead(entries: DisplayEntry[], currentReadState: ReadStateMap) {
  if (typeof window === "undefined" || entries.length === 0) {
    return;
  }

  const nextReadState = { ...currentReadState };
  let hasChanged = false;

  for (const entry of entries) {
    if (nextReadState[entry.link]) {
      continue;
    }

    nextReadState[entry.link] = {
      readAt: new Date().toISOString(),
    };
    hasChanged = true;
  }

  if (!hasChanged) {
    return;
  }

  writeReadState(nextReadState);
}

export function clearReadState() {
  if (typeof window === "undefined") {
    return;
  }

  cachedReadStateRaw = null;
  cachedReadState = EMPTY_READ_STATE;
  window.localStorage.removeItem(READ_STATE_STORAGE_KEY);
  window.dispatchEvent(new Event(READ_STATE_EVENT_NAME));
}

function subscribeToReadState(onStoreChange: () => void) {
  return subscribeToStorage(READ_STATE_STORAGE_KEY, READ_STATE_EVENT_NAME, onStoreChange);
}

function getServerReadStateSnapshot(): ReadStateMap {
  return EMPTY_READ_STATE;
}

export function useReadStateMap() {
  return useSyncExternalStore(subscribeToReadState, readReadState, getServerReadStateSnapshot);
}

// ---------------------------------------------------------------------------
// Feed cache
// ---------------------------------------------------------------------------

function readFeedCache(): FeedCache {
  if (typeof window === "undefined") {
    return EMPTY_FEED_CACHE;
  }

  try {
    const raw = window.localStorage.getItem(FEED_CACHE_STORAGE_KEY);

    if (!raw) {
      cachedFeedCacheRaw = null;
      cachedFeedCache = EMPTY_FEED_CACHE;
      return cachedFeedCache;
    }

    if (raw === cachedFeedCacheRaw) {
      return cachedFeedCache;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      cachedFeedCacheRaw = null;
      cachedFeedCache = EMPTY_FEED_CACHE;
      return cachedFeedCache;
    }

    const entriesValue = (parsed as { entries?: unknown }).entries;
    const cachedAtValue = (parsed as { cachedAt?: unknown }).cachedAt;

    cachedFeedCacheRaw = raw;
    cachedFeedCache = {
      entries: Array.isArray(entriesValue)
        ? entriesValue.flatMap((entry) => {
            const normalizedEntry = normalizeDisplayEntry(entry);
            return normalizedEntry ? [normalizedEntry] : [];
          })
        : EMPTY_FEED_CACHE.entries,
      cachedAt: typeof cachedAtValue === "string" ? cachedAtValue : undefined,
    };

    if (cachedFeedCache.entries.length === 0 && !cachedFeedCache.cachedAt) {
      cachedFeedCache = EMPTY_FEED_CACHE;
    }

    return cachedFeedCache;
  } catch {
    cachedFeedCacheRaw = null;
    cachedFeedCache = EMPTY_FEED_CACHE;
    return cachedFeedCache;
  }
}

export function writeFeedCache(feedCache: FeedCache) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = JSON.stringify(feedCache);

    if (raw === cachedFeedCacheRaw) {
      return;
    }

    cachedFeedCacheRaw = raw;
    cachedFeedCache = feedCache.entries.length > 0 || feedCache.cachedAt ? feedCache : EMPTY_FEED_CACHE;
    window.localStorage.setItem(FEED_CACHE_STORAGE_KEY, raw);
    window.dispatchEvent(new Event(FEED_CACHE_EVENT_NAME));
  } catch {
    // Ignore storage write errors and keep the UI usable.
  }
}

export function clearFeedCache() {
  if (typeof window === "undefined") {
    return;
  }

  cachedFeedCacheRaw = null;
  cachedFeedCache = EMPTY_FEED_CACHE;
  window.localStorage.removeItem(FEED_CACHE_STORAGE_KEY);
  window.dispatchEvent(new Event(FEED_CACHE_EVENT_NAME));
}

export function clearAllStoredData() {
  clearFeedCache();
  clearReadState();
  clearBookmarks();
}

function subscribeToFeedCache(onStoreChange: () => void) {
  return subscribeToStorage(FEED_CACHE_STORAGE_KEY, FEED_CACHE_EVENT_NAME, onStoreChange);
}

function getServerFeedCacheSnapshot(): FeedCache {
  return EMPTY_FEED_CACHE;
}

export function useFeedCacheStore() {
  return useSyncExternalStore(subscribeToFeedCache, readFeedCache, getServerFeedCacheSnapshot);
}

export function useVisibleEntries(entries: DisplayEntry[], selectedFeedId: string, isAllFetchFailed: boolean) {
  const feedCache = useFeedCacheStore();

  const cachedEntries = useMemo(
    () =>
      selectedFeedId
        ? feedCache.entries.filter((entry) => entry.feedId === selectedFeedId)
        : feedCache.entries,
    [feedCache.entries, selectedFeedId],
  );

  return entries.length === 0 && isAllFetchFailed && cachedEntries.length > 0 ? cachedEntries : entries;
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function subscribeToStorage(storageKey: string, eventName: string, onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      onStoreChange();
    }
  };

  const handleCustomEvent = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(eventName, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(eventName, handleCustomEvent);
  };
}

function normalizeDisplayEntry(value: unknown): DisplayEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DisplayEntry>;

  if (
    typeof candidate.title !== "string" ||
    typeof candidate.link !== "string" ||
    typeof candidate.feedId !== "string" ||
    typeof candidate.feedTitle !== "string" ||
    typeof candidate.feedUrl !== "string"
  ) {
    return null;
  }

  return {
    title: candidate.title,
    link: candidate.link,
    publishedAt: typeof candidate.publishedAt === "string" ? candidate.publishedAt : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary : undefined,
    matchedHighlightKeywords: Array.isArray(candidate.matchedHighlightKeywords)
      ? candidate.matchedHighlightKeywords.filter((keyword): keyword is string => typeof keyword === "string")
      : [],
    feedId: candidate.feedId,
    feedTitle: candidate.feedTitle,
    feedUrl: candidate.feedUrl,
    siteUrl: typeof candidate.siteUrl === "string" ? candidate.siteUrl : undefined,
  };
}
