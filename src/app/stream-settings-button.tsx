"use client";

import { useEffect, useState } from "react";
import {
  clearAllStoredData,
  clearBookmarks,
  clearFeedCache,
  clearReadState,
} from "@/app/article-stream";
import styles from "./page.module.css";

export function StreamSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

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
        className={styles.streamSettingsButton}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        設定
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
            aria-labelledby="stream-settings-title"
          >
            <div className={styles.settingsDialogHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Settings</p>
                <h3 id="stream-settings-title">ローカル保存データの管理</h3>
              </div>
              <button
                type="button"
                className={styles.settingsCloseButton}
                onClick={() => setIsOpen(false)}
                aria-label="設定ダイアログを閉じる"
              >
                ×
              </button>
            </div>

            <div className={styles.settingsDialogBody}>
              <section className={styles.settingsGroup}>
                <div>
                  <h4>記事一覧キャッシュ</h4>
                  <p className={styles.settingsDescription}>
                    取得失敗時の代替表示に使う保存済み一覧を削除します。
                  </p>
                </div>
                <button type="button" className={styles.settingsDangerButton} onClick={clearFeedCache}>
                  記事一覧キャッシュを削除
                </button>
              </section>

              <section className={styles.settingsGroup}>
                <div>
                  <h4>既読 / 未読状態</h4>
                  <p className={styles.settingsDescription}>
                    既読ラベルと未読管理の状態を初期化します。
                  </p>
                </div>
                <button type="button" className={styles.settingsDangerButton} onClick={clearReadState}>
                  既読 / 未読状態を削除
                </button>
              </section>

              <section className={styles.settingsGroup}>
                <div>
                  <h4>ブックマーク</h4>
                  <p className={styles.settingsDescription}>
                    ローカルに一時保存しているブックマークを削除します。
                  </p>
                </div>
                <button type="button" className={styles.settingsDangerButton} onClick={clearBookmarks}>
                  ブックマークを削除
                </button>
              </section>
            </div>

            <div className={styles.settingsDialogFooter}>
              <button type="button" className={styles.settingsDangerButton} onClick={clearAllStoredData}>
                すべて削除
              </button>
              <button type="button" className={styles.settingsSecondaryButton} onClick={() => setIsOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
