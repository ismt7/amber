"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { DisplayEntry } from "@/lib/storage";
import { formatPublishedAt } from "@/lib/date-utils";
import styles from "./page.module.css";

export type EntryCardProps = {
  entry: DisplayEntry;
  isBookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (entry: DisplayEntry) => void;
  onMarkAsRead: (link: string) => void;
  onToggleReadState: (link: string) => void;
};

export function EntryCard({
  entry,
  isBookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsRead,
  onToggleReadState,
}: EntryCardProps) {
  // Memoize the RegExp so it isn't rebuilt on every render (js-hoist-regexp).
  const highlightPattern = useMemo(
    () =>
      entry.matchedHighlightKeywords.length > 0
        ? new RegExp(
            `(${entry.matchedHighlightKeywords.map(escapeRegExp).sort(byLengthDesc).join("|")})`,
            "gi",
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry.matchedHighlightKeywords.join(",")],
  );

  return (
    <li className={styles.entryItem}>
      <article className={styles.entryCard}>
        <div className={styles.entryActions}>
          <button
            type="button"
            className={clsx(styles.readToggleButton, isRead && styles.readToggleButtonActive)}
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
            className={clsx(styles.bookmarkButton, isBookmarked && styles.bookmarkButtonActive)}
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
          className={clsx(styles.entryLink, isRead && styles.entryLinkRead)}
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
            {renderHighlightedText(entry.title, highlightPattern, entry.matchedHighlightKeywords)}
          </span>
          {entry.summary ? (
            <span className={styles.entrySummary}>
              {renderHighlightedText(entry.summary, highlightPattern, entry.matchedHighlightKeywords)}
            </span>
          ) : null}
        </a>
      </article>
    </li>
  );
}

function renderHighlightedText(text: string, pattern: RegExp | null, keywords: string[]) {
  if (!pattern) {
    return text;
  }

  // split() with a capturing group preserves the matched portions in the result.
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const matchedKeyword = keywords.find(
      (keyword) => keyword.toLocaleLowerCase() === part.toLocaleLowerCase(),
    );

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
