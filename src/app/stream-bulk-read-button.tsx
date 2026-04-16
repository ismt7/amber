"use client";

import { useMemo, useState } from "react";
import {
  markEntriesAsRead,
  type DisplayEntry,
  useReadStateMap,
  useVisibleEntries,
} from "@/lib/storage";
import { Dialog } from "@/app/dialog";
import styles from "./page.module.css";

type StreamBulkReadButtonProps = {
  allEntries: DisplayEntry[];
  selectedFeedId: string;
  isAllFetchFailed: boolean;
};

export function StreamBulkReadButton({
  allEntries,
  selectedFeedId,
  isAllFetchFailed,
}: StreamBulkReadButtonProps) {
  const readState = useReadStateMap();

  // Filter client-side, consistent with ArticleStream (server-dedup-props).
  const entries = useMemo(
    () => (selectedFeedId ? allEntries.filter((e) => e.feedId === selectedFeedId) : allEntries),
    [allEntries, selectedFeedId],
  );

  const visibleEntries = useVisibleEntries(entries, selectedFeedId, isAllFetchFailed);
  const [isOpen, setIsOpen] = useState(false);

  const unreadEntries = useMemo(
    () => visibleEntries.filter((entry) => !readState[entry.link]),
    [readState, visibleEntries],
  );

  const isDisabled = visibleEntries.length === 0 || unreadEntries.length === 0;

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

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} labelId="bulk-read-title">
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
      </Dialog>
    </>
  );
}
