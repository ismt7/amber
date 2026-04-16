"use client";

import type { BookmarkMap, DisplayEntry, ReadStateMap } from "@/lib/storage";
import { EntryCard } from "@/app/entry-card";
import styles from "./page.module.css";

export type CollapsibleEntrySectionProps = {
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

export function CollapsibleEntrySection({
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
