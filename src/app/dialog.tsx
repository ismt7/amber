"use client";

import { useEffect, type ReactNode } from "react";
import styles from "./page.module.css";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  labelId: string;
  children: ReactNode;
};

export function Dialog({ isOpen, onClose, labelId, children }: DialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.settingsDialogBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.settingsDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        {children}
      </div>
    </div>
  );
}
