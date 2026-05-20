import "server-only";

import { XMLParser } from "fast-xml-parser";
import { loadFeedConfig, type FeedConfig } from "@/lib/feed-config";
import { persistFeedEntries } from "@/lib/db/persist-feed-entries";

export type FeedEntry = {
  title: string;
  link: string;
  publishedAt?: string;
  summary?: string;
  matchedHighlightKeywords: string[];
};

export type FeedSyncResult = {
  feed: FeedConfig;
  entries: FeedEntry[];
  filteredOutCount: number;
  error?: string;
};

export type FeedSyncSummary = {
  fetchedAt: string;
  totals: {
    feeds: number;
    succeeded: number;
    failed: number;
    entries: number;
    filteredOut: number;
  };
  failures: Array<{
    feedId: string;
    feedTitle: string;
    feedUrl: string;
    error: string;
  }>;
  results: FeedSyncResult[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true,
});

export async function syncFeedsBatch(): Promise<FeedSyncSummary> {
  const feeds = await loadFeedConfig();
  const results = await Promise.all(
    feeds.map(async (feed): Promise<FeedSyncResult> => {
      try {
        const { entries, filteredOutCount } = await fetchAndPersistFeedEntries(feed);
        return { feed, entries, filteredOutCount };
      } catch (error) {
        const message = error instanceof Error ? error.message : "取得に失敗しました。";
        console.error(`[feed-sync] failed for ${feed.id} (${feed.url})`, error);
        return {
          feed,
          entries: [],
          filteredOutCount: 0,
          error: message,
        };
      }
    }),
  );

  const failures = results
    .filter((result): result is FeedSyncResult & { error: string } => typeof result.error === "string")
    .map((result) => ({
      feedId: result.feed.id,
      feedTitle: result.feed.title,
      feedUrl: result.feed.url,
      error: result.error,
    }));

  return {
    fetchedAt: new Date().toISOString(),
    totals: {
      feeds: results.length,
      succeeded: results.length - failures.length,
      failed: failures.length,
      entries: results.reduce((sum, result) => sum + result.entries.length, 0),
      filteredOut: results.reduce((sum, result) => sum + result.filteredOutCount, 0),
    },
    failures,
    results,
  };
}

async function fetchAndPersistFeedEntries(feed: FeedConfig): Promise<{
  entries: FeedEntry[];
  filteredOutCount: number;
}> {
  const response = await fetch(feed.url, {
    cache: "no-store",
    headers: {
      "user-agent": "amber-rss-reader/0.1",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as ParsedXml;
  const allEntries = parseEntries(parsed);
  const filteredEntries = allEntries.filter((entry) => !matchesKeywords(entry, feed.filterKeywords));
  const filteredOutCount = allEntries.length - filteredEntries.length;
  const entries = filteredEntries
    .map((entry) => ({
      ...entry,
      matchedHighlightKeywords: collectMatchedKeywords(entry, feed.highlightKeywords),
    }))
    .slice(0, feed.limit);

  if (allEntries.length === 0) {
    throw new Error("記事を抽出できませんでした。");
  }

  await persistFeedEntries(feed.id, entries);

  return { entries, filteredOutCount };
}

type ParsedXml = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
  feed?: {
    entry?: AtomEntry | AtomEntry[];
  };
  RDF?: {
    item?: RssItem | RssItem[];
  };
};

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  date?: string;
  description?: string;
  encoded?: string;
};

type AtomLink =
  | string
  | {
      href?: string;
      rel?: string;
    };

type AtomEntry = {
  title?: string;
  link?: AtomLink | AtomLink[];
  updated?: string;
  published?: string;
  summary?: string;
  content?: string;
};

function parseEntries(parsed: ParsedXml): FeedEntry[] {
  const rssItems = parsed.rss?.channel?.item ?? parsed.RDF?.item;
  if (rssItems) {
    return asArray(rssItems)
      .map((item) => ({
        title: item.title?.trim() || "Untitled",
        link: item.link?.trim() || "",
        publishedAt: item.pubDate?.trim() || item.date?.trim(),
        summary: stripHtml(item.description || item.encoded),
        matchedHighlightKeywords: [],
      }))
      .filter((item) => item.link);
  }

  const atomEntries = parsed.feed?.entry;
  if (atomEntries) {
    return asArray(atomEntries)
      .map((entry) => ({
        title: entry.title?.trim() || "Untitled",
        link: extractAtomLink(entry.link),
        publishedAt: entry.published?.trim() || entry.updated?.trim(),
        summary: stripHtml(entry.summary || entry.content),
        matchedHighlightKeywords: [],
      }))
      .filter((item) => item.link);
  }

  return [];
}

function extractAtomLink(link?: AtomLink | AtomLink[]) {
  const links = asArray(link);
  const alternate = links.find(
    (item): item is Exclude<AtomLink, string> =>
      typeof item === "object" && !!item && (!item.rel || item.rel === "alternate"),
  );

  if (alternate?.href) {
    return alternate.href.trim();
  }

  const first = links[0];
  if (typeof first === "string") {
    return first.trim();
  }

  return first?.href?.trim() || "";
}

function stripHtml(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function asArray<T>(value?: T | T[]) {
  if (!value) {
    return [] as T[];
  }

  return Array.isArray(value) ? value : [value];
}

function matchesKeywords(entry: FeedEntry, keywords: string[]) {
  if (keywords.length === 0) {
    return false;
  }

  const haystack = `${entry.title}\n${entry.summary ?? ""}`.toLocaleLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword.toLocaleLowerCase()));
}

function collectMatchedKeywords(entry: FeedEntry, keywords: string[]) {
  if (keywords.length === 0) {
    return [];
  }

  const haystack = `${entry.title}\n${entry.summary ?? ""}`.toLocaleLowerCase();

  return keywords.filter((keyword) => haystack.includes(keyword.toLocaleLowerCase()));
}
