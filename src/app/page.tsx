import { ArticleStream, type DisplayEntry } from "@/app/article-stream";
import { FeedFilter } from "@/app/feed-filter";
import { StreamBulkReadButton } from "@/app/stream-bulk-read-button";
import { StreamSettingsButton } from "@/app/stream-settings-button";
import { loadFeedResults } from "@/lib/rss";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    feed?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const { results } = await loadFeedResults();
  const filteredOutCount = results.reduce((sum, result) => sum + result.filteredOutCount, 0);
  const requestedFeedId = getFeedQueryParam(params?.feed);
  const feedOptions = results.map((result) => ({
    value: result.feed.id,
    label: result.feed.title,
  }));
  const selectedFeedId = feedOptions.some((option) => option.value === requestedFeedId)
    ? requestedFeedId
    : "";
  const allEntries: DisplayEntry[] = results
    .flatMap((result) =>
      result.entries.map((entry) => ({
        ...entry,
        feedId: result.feed.id,
        feedTitle: result.feed.title,
        feedUrl: result.feed.url,
        siteUrl: result.feed.siteUrl,
      })),
    )
    .sort((left, right) => comparePublishedAt(right.publishedAt, left.publishedAt));
  const mergedEntries = selectedFeedId
    ? allEntries.filter((entry) => entry.feedId === selectedFeedId)
    : allEntries;
  const selectedFeedTitle = selectedFeedId
    ? feedOptions.find((option) => option.value === selectedFeedId)?.label ?? ""
    : "";
  const displayedEntriesCount = mergedEntries.length;
  const failedFeeds = results.filter((result) => result.error);
  const isAllFetchFailed = failedFeeds.length === results.length;
  const canRefreshCache = failedFeeds.length === 0;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>RSSリーダー</h1>
          <p className={styles.lead}>
            フィード URL はルートの YAML で管理し、サーバー側で RSS/Atom を取得して表示します。
          </p>
          <dl className={styles.stats}>
            <div>
              <dt>購読フィード</dt>
              <dd>{results.length}</dd>
            </div>
            <div>
              <dt>取得記事数</dt>
              <dd>{displayedEntriesCount}</dd>
            </div>
            <div>
              <dt>除外記事数</dt>
              <dd>{filteredOutCount}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.stream}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionHeader}>
              <h2>{selectedFeedTitle ? `${selectedFeedTitle} の記事を表示中` : "一覧"}</h2>
            </div>
            <div className={styles.sectionActions}>
              <StreamBulkReadButton
                entries={mergedEntries}
                selectedFeedId={selectedFeedId}
                isAllFetchFailed={isAllFetchFailed}
              />
              <StreamSettingsButton />
            </div>
          </div>
          <FeedFilter options={feedOptions} value={selectedFeedId} />
          <ArticleStream
            entries={mergedEntries}
            allEntries={allEntries}
            hasMediaFilter={Boolean(selectedFeedId)}
            selectedFeedId={selectedFeedId}
            isAllFetchFailed={isAllFetchFailed}
            canRefreshCache={canRefreshCache}
          />
        </section>

        {failedFeeds.length > 0 ? (
          <section className={styles.errorPanel}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Fetch errors</p>
              <h2>取得できなかったフィード</h2>
            </div>
            <ul className={styles.errorList}>
              {failedFeeds.map((result) => (
                <li key={result.feed.id} className={styles.errorMessage}>
                  <strong>{result.feed.title}</strong>
                  <span>{result.error}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function comparePublishedAt(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : Number.NEGATIVE_INFINITY;
  const rightTime = right ? new Date(right).getTime() : Number.NEGATIVE_INFINITY;

  return normalizeTime(leftTime) - normalizeTime(rightTime);
}

function normalizeTime(value: number) {
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function getFeedQueryParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
