"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type DisplayEntry,
  useBookmarks,
  useFeedCacheStore,
  useReadStateMap,
  useVisibleEntries,
  writeBookmarks,
  writeFeedCache,
  writeReadState,
} from "@/lib/storage";
import { comparePublishedAt } from "@/lib/date-utils";
import { formatPublishedAt } from "@/lib/date-utils";
import { CollapsibleEntrySection } from "@/app/collapsible-entry-section";
import { EntryCard } from "@/app/entry-card";
import styles from "./page.module.css";

export type { DisplayEntry };

type ArticleStreamProps = {
  // Receives all entries; filtering by selectedFeedId happens client-side
  // to avoid duplicate RSC serialization of filtered arrays (server-dedup-props).
  allEntries: DisplayEntry[];
  hasMediaFilter: boolean;
  selectedFeedId: string;
  isAllFetchFailed: boolean;
  canRefreshCache: boolean;
};

export function ArticleStream({
  allEntries,
  hasMediaFilter,
  selectedFeedId,
  isAllFetchFailed,
  canRefreshCache,
}: ArticleStreamProps) {
  const [isBookmarkSectionOpen, setIsBookmarkSectionOpen] = useState(false);
  const [isReadSectionOpen, setIsReadSectionOpen] = useState(false);
  const bookmarks = useBookmarks();
  const readState = useReadStateMap();
  const feedCache = useFeedCacheStore();

  // Filter client-side so only allEntries is serialised by RSC (server-dedup-props).
  const entries = useMemo(
    () => (selectedFeedId ? allEntries.filter((e) => e.feedId === selectedFeedId) : allEntries),
    [allEntries, selectedFeedId],
  );

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

  // useCallback stabilises these refs so child components don't re-render needlessly.
  const toggleBookmark = useCallback(
    (entry: DisplayEntry) => {
      const nextBookmarks = { ...bookmarks };

      if (nextBookmarks[entry.link]) {
        delete nextBookmarks[entry.link];
      } else {
        nextBookmarks[entry.link] = entry;
      }

      writeBookmarks(nextBookmarks);
    },
    [bookmarks],
  );

  const markAsRead = useCallback(
    (link: string) => {
      if (readState[link]) {
        return;
      }

      writeReadState({
        ...readState,
        [link]: { readAt: new Date().toISOString() },
      });
    },
    [readState],
  );

  const toggleReadState = useCallback(
    (link: string) => {
      const nextReadState = { ...readState };

      if (nextReadState[link]) {
        delete nextReadState[link];
      } else {
        nextReadState[link] = { readAt: new Date().toISOString() };
      }

      writeReadState(nextReadState);
    },
    [readState],
  );

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
