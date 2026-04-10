"use client";

import { useEffect, useMemo, useState } from "react";
import {
  markEntriesAsRead,
  type DisplayEntry,
  useReadStateMap,
  useVisibleEntries,
} from "@/app/article-stream";
import styles from "./page.module.css";

type StreamBulkReadButtonProps = {
  entries: DisplayEntry[];
  selectedFeedId: string;
  isAllFetchFailed: boolean;
};

export function StreamBulkReadButton({
  entries,
  selectedFeedId,
  isAllFetchFailed,
}: StreamBulkReadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const readState = useReadStateMap();
  const visibleEntries = useVisibleEntries(entries, selectedFeedId, isAllFetchFailed);

  const unreadEntries = useMemo(
    () => visibleEntries.filter((entry) => !readState[entry.link]),
    [readState, visibleEntries],
  );

  const isDisabled = visibleEntries.length === 0 || unreadEntries.length === 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={styles.streamPrimaryButton}
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
      >
        まとめて既読
      </button>

      {isOpen ? (
        <div
          className={styles.settingsDialogBackdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className={styles.settingsDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-read-title"
          >
            <div className={styles.settingsDialogHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Bulk read</p>
                <h3 id="bulk-read-title">表示中の記事をまとめて既読にする</h3>
              </div>
            </div>

            <div className={styles.settingsDialogBody}>
              <section className={styles.settingsGroup}>
                <div>
                  <h4>実行内容</h4>
                  <p className={styles.settingsDescription}>
                    現在表示中の {visibleEntries.length} 件のうち、未読 {unreadEntries.length} 件を既読にします。
                  </p>
                </div>
              </section>
            </div>

            <div className={styles.settingsDialogFooter}>
              <button
                type="button"
                className={styles.streamPrimaryButton}
                onClick={() => {
                  markEntriesAsRead(unreadEntries, readState);
                  setIsOpen(false);
                }}
              >
                実行する
              </button>
              <button type="button" className={styles.settingsSecondaryButton} onClick={() => setIsOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
