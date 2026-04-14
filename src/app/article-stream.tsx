"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "./page.module.css";

const BOOKMARK_STORAGE_KEY = "amber:bookmarks";
const BOOKMARK_EVENT_NAME = "amber:bookmarks:change";
const READ_STATE_STORAGE_KEY = "amber:read-state";
const READ_STATE_EVENT_NAME = "amber:read-state:change";
const FEED_CACHE_STORAGE_KEY = "amber:feed-cache";
const FEED_CACHE_EVENT_NAME = "amber:feed-cache:change";

type BookmarkMap = Record<string, DisplayEntry>;
type ReadStateMap = Record<string, { readAt: string }>;
type FeedCache = {
  entries: DisplayEntry[];
  cachedAt?: string;
};

const EMPTY_BOOKMARKS: BookmarkMap = {};
const EMPTY_READ_STATE: ReadStateMap = {};
const EMPTY_FEED_CACHE: FeedCache = { entries: [] };

let cachedBookmarks: BookmarkMap = EMPTY_BOOKMARKS;
let cachedBookmarksRaw: string | null = null;

let cachedReadState: ReadStateMap = EMPTY_READ_STATE;
let cachedReadStateRaw: string | null = null;

let cachedFeedCache: FeedCache = EMPTY_FEED_CACHE;
let cachedFeedCacheRaw: string | null = null;

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

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

type ArticleStreamProps = {
  entries: DisplayEntry[];
  allEntries: DisplayEntry[];
  hasMediaFilter: boolean;
  selectedFeedId: string;
  isAllFetchFailed: boolean;
  canRefreshCache: boolean;
};

export function ArticleStream({
  entries,
  allEntries,
  hasMediaFilter,
  selectedFeedId,
  isAllFetchFailed,
  canRefreshCache,
}: ArticleStreamProps) {
  const [isBookmarkSectionOpen, setIsBookmarkSectionOpen] = useState(false);
  const [isReadSectionOpen, setIsReadSectionOpen] = useState(false);
  const bookmarks = useSyncExternalStore(subscribeToBookmarks, readBookmarks, getServerBookmarksSnapshot);
  const readState = useReadStateMap();
  const feedCache = useFeedCacheStore();

  useEffect(() => {
    if (!canRefreshCache || allEntries.length === 0) {
      return;
    }

    writeFeedCache({
      entries: allEntries,
      cachedAt: new Date().toISOString(),
    });
  }, [allEntries, canRefreshCache]);

  const bookmarkedEntries = useMemo(
    () => Object.values(bookmarks).sort((left, right) => comparePublishedAt(right.publishedAt, left.publishedAt)),
    [bookmarks],
  );

  const visibleEntries = useVisibleEntries(entries, selectedFeedId, isAllFetchFailed);
  const isUsingCachedEntries = entries.length === 0 && isAllFetchFailed && visibleEntries.length > 0;
  const unreadEntries = useMemo(
    () => visibleEntries.filter((entry) => !readState[entry.link]),
    [readState, visibleEntries],
  );
  const readEntries = useMemo(
    () => visibleEntries.filter((entry) => Boolean(readState[entry.link])),
    [readState, visibleEntries],
  );

  function toggleBookmark(entry: DisplayEntry) {
    const nextBookmarks = { ...bookmarks };

    if (nextBookmarks[entry.link]) {
      delete nextBookmarks[entry.link];
    } else {
      nextBookmarks[entry.link] = entry;
    }

    writeBookmarks(nextBookmarks);
  }

  function markAsRead(link: string) {
    if (readState[link]) {
      return;
    }

    writeReadState({
      ...readState,
      [link]: {
        readAt: new Date().toISOString(),
      },
    });
  }

  function toggleReadState(link: string) {
    const nextReadState = { ...readState };

    if (nextReadState[link]) {
      delete nextReadState[link];
    } else {
      nextReadState[link] = {
        readAt: new Date().toISOString(),
      };
    }

    writeReadState(nextReadState);
  }

  return (
    <>
      {isUsingCachedEntries ? (
        <p className={styles.cacheNotice}>
          取得に失敗したため、前回保存した記事一覧を表示しています。
          {feedCache.cachedAt ? ` 最終キャッシュ: ${formatPublishedAt(feedCache.cachedAt)}` : ""}
        </p>
      ) : null}

      <CollapsibleEntrySection
        title="ブックマーク"
        count={bookmarkedEntries.length}
        isOpen={isBookmarkSectionOpen}
        onToggle={() => setIsBookmarkSectionOpen((current) => !current)}
        emptyMessage="まだブックマークした記事はありません。"
        entries={bookmarkedEntries}
        entryKeyPrefix="bookmark"
        bookmarks={bookmarks}
        readState={readState}
        onToggleBookmark={toggleBookmark}
        onMarkAsRead={markAsRead}
        onToggleReadState={toggleReadState}
      />

      <ul className={styles.entryList}>
        {unreadEntries.length > 0 ? (
          unreadEntries.map((entry) => (
            <EntryCard
              key={`${entry.feedId}-${entry.link}`}
              entry={entry}
              isBookmarked={Boolean(bookmarks[entry.link])}
              isRead={Boolean(readState[entry.link])}
              onToggleBookmark={toggleBookmark}
              onMarkAsRead={markAsRead}
              onToggleReadState={toggleReadState}
            />
          ))
        ) : visibleEntries.length > 0 ? (
          <li className={styles.emptyState}>表示中の記事はすべて既読です。下の「既読」から確認できます。</li>
        ) : (
          <li className={styles.emptyState}>
            {hasMediaFilter
              ? "選択中のメディアでは表示できる記事がありません。"
              : "現在のキーワード条件で表示できる記事がありません。"}
          </li>
        )}
      </ul>

      <CollapsibleEntrySection
        title="既読"
        count={readEntries.length}
        isOpen={isReadSectionOpen}
        onToggle={() => setIsReadSectionOpen((current) => !current)}
        emptyMessage="まだ既読にした記事はありません。"
        entries={readEntries}
        entryKeyPrefix="read"
        bookmarks={bookmarks}
        readState={readState}
        onToggleBookmark={toggleBookmark}
        onMarkAsRead={markAsRead}
        onToggleReadState={toggleReadState}
      />
    </>
  );
}

type CollapsibleEntrySectionProps = {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  emptyMessage: string;
  entries: DisplayEntry[];
  entryKeyPrefix: string;
  bookmarks: BookmarkMap;
  readState: ReadStateMap;
  onToggleBookmark: (entry: DisplayEntry) => void;
  onMarkAsRead: (link: string) => void;
  onToggleReadState: (link: string) => void;
};

function CollapsibleEntrySection({
  title,
  count,
  isOpen,
  onToggle,
  emptyMessage,
  entries,
  entryKeyPrefix,
  bookmarks,
  readState,
  onToggleBookmark,
  onMarkAsRead,
  onToggleReadState,
}: CollapsibleEntrySectionProps) {
  return (
    <section className={styles.collapsiblePanel}>
      <button type="button" className={styles.collapsibleSectionToggle} aria-expanded={isOpen} onClick={onToggle}>
        <span className={styles.collapsibleSectionHeading}>{title}</span>
        <span className={styles.collapsibleSectionMeta}>{count}件</span>
        <span className={styles.collapsibleSectionIcon} aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen ? (
        entries.length > 0 ? (
          <ul className={styles.entryList}>
            {entries.map((entry) => (
              <EntryCard
                key={`${entryKeyPrefix}-${entry.link}`}
                entry={entry}
                isBookmarked={Boolean(bookmarks[entry.link])}
                isRead={Boolean(readState[entry.link])}
                onToggleBookmark={onToggleBookmark}
                onMarkAsRead={onMarkAsRead}
                onToggleReadState={onToggleReadState}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>{emptyMessage}</p>
        )
      ) : null}
    </section>
  );
}

type EntryCardProps = {
  entry: DisplayEntry;
  isBookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (entry: DisplayEntry) => void;
  onMarkAsRead: (link: string) => void;
  onToggleReadState: (link: string) => void;
};

function EntryCard({
  entry,
  isBookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsRead,
  onToggleReadState,
}: EntryCardProps) {
  return (
    <li className={styles.entryItem}>
      <article className={styles.entryCard}>
        <div className={styles.entryActions}>
          <button
            type="button"
            className={`${styles.readToggleButton} ${isRead ? styles.readToggleButtonActive : ""}`.trim()}
            onClick={() => onToggleReadState(entry.link)}
            aria-label={isRead ? "未読に戻す" : "既読にする"}
            aria-pressed={isRead}
            title={isRead ? "未読に戻す" : "既読にする"}
          >
            <svg viewBox="0 0 24 24" className={styles.readToggleIcon} aria-hidden="true">
              <path
                d="M7.5 12.5 10.5 15.5 16.5 8.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>

          <button
            type="button"
            className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarkButtonActive : ""}`.trim()}
            onClick={() => onToggleBookmark(entry)}
            aria-label={isBookmarked ? "ブックマークを解除" : "ブックマークに保存"}
            aria-pressed={isBookmarked}
            title={isBookmarked ? "ブックマークを解除" : "ブックマークに保存"}
          >
            <svg viewBox="0 0 24 24" className={styles.bookmarkButtonIcon} aria-hidden="true">
              <path
                d="M6.75 4.75h10.5a.5.5 0 0 1 .5.5v13.19l-5.35-3.18a.75.75 0 0 0-.8 0l-5.35 3.18V5.25a.5.5 0 0 1 .5-.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>

        <a
          href={entry.link}
          target="_blank"
          rel="noreferrer"
          className={`${styles.entryLink} ${isRead ? styles.entryLinkRead : ""}`.trim()}
          onClick={() => onMarkAsRead(entry.link)}
          onAuxClick={(event) => {
            if (event.button === 1) {
              onMarkAsRead(entry.link);
            }
          }}
        >
          <div className={styles.entryMeta}>
            <span className={styles.feedBadge}>{entry.feedTitle}</span>
            {isRead ? <span className={styles.readBadge}>既読</span> : null}
            <span className={styles.feedHost}>{new URL(entry.feedUrl).hostname}</span>
            {entry.publishedAt ? (
              <time className={styles.entryDate} dateTime={entry.publishedAt}>
                {formatPublishedAt(entry.publishedAt)}
              </time>
            ) : null}
          </div>
          {entry.matchedHighlightKeywords.length > 0 ? (
            <div className={styles.highlightList}>
              {entry.matchedHighlightKeywords.map((keyword) => (
                <span key={`${entry.link}-${keyword}`} className={styles.highlightBadge}>
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
          <span className={styles.entryTitle}>
            {renderHighlightedText(entry.title, entry.matchedHighlightKeywords)}
          </span>
          {entry.summary ? (
            <span className={styles.entrySummary}>
              {renderHighlightedText(entry.summary, entry.matchedHighlightKeywords)}
            </span>
          ) : null}
        </a>
      </article>
    </li>
  );
}

function formatPublishedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

function comparePublishedAt(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : Number.NEGATIVE_INFINITY;
  const rightTime = right ? new Date(right).getTime() : Number.NEGATIVE_INFINITY;

  return normalizeTime(leftTime) - normalizeTime(rightTime);
}

function normalizeTime(value: number) {
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function renderHighlightedText(text: string, keywords: string[]) {
  if (keywords.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).sort(byLengthDesc).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const matchedKeyword = keywords.find((keyword) => keyword.toLocaleLowerCase() === part.toLocaleLowerCase());

    if (!matchedKeyword) {
      return part;
    }

    return (
      <mark key={`${matchedKeyword}-${index}`} className={styles.inlineHighlight}>
        {part}
      </mark>
    );
  });
}

function byLengthDesc(left: string, right: string) {
  return right.length - left.length;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function writeBookmarks(bookmarks: BookmarkMap) {
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

function writeReadState(readState: ReadStateMap) {
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

function writeFeedCache(feedCache: FeedCache) {
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

function subscribeToBookmarks(onStoreChange: () => void) {
  return subscribeToStorage(BOOKMARK_STORAGE_KEY, BOOKMARK_EVENT_NAME, onStoreChange);
}

function subscribeToReadState(onStoreChange: () => void) {
  return subscribeToStorage(READ_STATE_STORAGE_KEY, READ_STATE_EVENT_NAME, onStoreChange);
}

function subscribeToFeedCache(onStoreChange: () => void) {
  return subscribeToStorage(FEED_CACHE_STORAGE_KEY, FEED_CACHE_EVENT_NAME, onStoreChange);
}

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

function getServerBookmarksSnapshot(): BookmarkMap {
  return EMPTY_BOOKMARKS;
}

function getServerReadStateSnapshot(): ReadStateMap {
  return EMPTY_READ_STATE;
}

function getServerFeedCacheSnapshot(): FeedCache {
  return EMPTY_FEED_CACHE;
}

export function useReadStateMap() {
  return useSyncExternalStore(subscribeToReadState, readReadState, getServerReadStateSnapshot);
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
