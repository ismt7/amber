"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/app/dialog";
import type { FeedSyncSummary } from "@/lib/feed-sync-types";
import styles from "./page.module.css";

type ManualFeedSyncButtonProps = {
  canRun: boolean;
};

type FeedSyncErrorResponse = {
  error?: string;
};

export function ManualFeedSyncButton({ canRun }: ManualFeedSyncButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<FeedSyncSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRun() {
    setIsRunning(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/feed-sync", {
        method: "POST",
      });
      const data = (await response.json()) as FeedSyncSummary | FeedSyncErrorResponse;

      if (!response.ok) {
        setSummary(null);
        setErrorMessage(readErrorMessage(data));
        return;
      }

      setSummary(data as FeedSyncSummary);
      router.refresh();
    } catch {
      setSummary(null);
      setErrorMessage("バッチ実行に失敗しました。");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.streamPrimaryButton}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={!canRun}
        title={canRun ? undefined : "Postgres 未設定のため実行できません"}
      >
        バッチ実行
      </button>

      <Dialog isOpen={isOpen} onClose={() => !isRunning && setIsOpen(false)} labelId="manual-feed-sync-title">
        <div className={styles.settingsDialogHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Feed sync</p>
            <h3 id="manual-feed-sync-title">フィード同期バッチを手動実行する</h3>
          </div>
          <button
            type="button"
            className={styles.settingsCloseButton}
            onClick={() => setIsOpen(false)}
            aria-label="バッチ実行ダイアログを閉じる"
            disabled={isRunning}
          >
            ×
          </button>
        </div>

        <div className={styles.settingsDialogBody}>
          <section className={styles.settingsGroup}>
            <div>
              <h4>実行内容</h4>
              <p className={styles.settingsDescription}>
                画面上から既存のフィード同期ジョブを即時実行します。実行中は重複起動されず、完了後に一覧を再読み込みします。
              </p>
            </div>
          </section>

          {!canRun ? (
            <p className={`${styles.syncStatusMessage} ${styles.syncStatusError}`}>
              DATABASE_URL などの Postgres 接続設定がないため、手動実行できません。
            </p>
          ) : null}

          {errorMessage ? (
            <p className={`${styles.syncStatusMessage} ${styles.syncStatusError}`}>{errorMessage}</p>
          ) : null}

          {summary ? (
            <section className={styles.settingsGroup}>
              <div>
                <h4>実行結果</h4>
                <p className={styles.settingsDescription}>取得時刻: {formatDateTime(summary.fetchedAt)}</p>
              </div>
              <dl className={styles.syncSummaryGrid}>
                <div>
                  <dt>対象</dt>
                  <dd>{summary.totals.feeds}</dd>
                </div>
                <div>
                  <dt>成功</dt>
                  <dd>{summary.totals.succeeded}</dd>
                </div>
                <div>
                  <dt>失敗</dt>
                  <dd>{summary.totals.failed}</dd>
                </div>
                <div>
                  <dt>記事</dt>
                  <dd>{summary.totals.entries}</dd>
                </div>
              </dl>

              {summary.failures.length > 0 ? (
                <ul className={styles.syncFailureList}>
                  {summary.failures.map((failure) => (
                    <li key={failure.feedId}>
                      <strong>{failure.feedTitle}</strong>
                      <span>{failure.error}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`${styles.syncStatusMessage} ${styles.syncStatusSuccess}`}>すべてのフィードを同期しました。</p>
              )}
            </section>
          ) : null}
        </div>

        <div className={styles.settingsDialogFooter}>
          <button type="button" className={styles.streamPrimaryButton} onClick={handleRun} disabled={!canRun || isRunning}>
            {isRunning ? "実行中..." : "実行する"}
          </button>
          <button
            type="button"
            className={styles.settingsSecondaryButton}
            onClick={() => setIsOpen(false)}
            disabled={isRunning}
          >
            閉じる
          </button>
        </div>
      </Dialog>
    </>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function readErrorMessage(data: FeedSyncSummary | FeedSyncErrorResponse) {
  return "error" in data && data.error ? data.error : "バッチ実行に失敗しました。";
}
