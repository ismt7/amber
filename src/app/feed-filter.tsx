"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import styles from "./page.module.css";

type FeedFilterProps = {
  options: Array<{
    value: string;
    label: string;
  }>;
  value: string;
};

export function FeedFilter({ options, value }: FeedFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextValue: string) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextValue) {
      nextSearchParams.set("feed", nextValue);
    } else {
      nextSearchParams.delete("feed");
    }

    const nextQuery = nextSearchParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  return (
    <div className={styles.filterBar}>
      <label className={styles.filterControl}>
        <span className={styles.filterLabel}>表示メディア</span>
        <select
          className={styles.filterSelect}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isPending}
          aria-label="表示メディア"
        >
          <option value="">すべて</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
