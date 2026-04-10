import "server-only";

import { XMLParser } from "fast-xml-parser";
import { getFeedConfigPath, loadFeedConfig, type FeedConfig } from "@/lib/feed-config";

export type FeedEntry = {
  title: string;
  link: string;
  publishedAt?: string;
  summary?: string;
  matchedHighlightKeywords: string[];
};

export type FeedResult = {
  feed: FeedConfig;
  entries: FeedEntry[];
  filteredOutCount: number;
  error?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true,
});

export async function loadFeedResults() {
  const feedConfigs = await loadFeedConfig();
  const results = await Promise.all(
    feedConfigs.map(async (feed) => {
      try {
        const { entries, filteredOutCount } = await fetchFeedEntries(feed);
        return { feed, entries, filteredOutCount } satisfies FeedResult;
      } catch (error) {
        return {
          feed,
          entries: [],
          filteredOutCount: 0,
          error: error instanceof Error ? error.message : "取得に失敗しました。",
        } satisfies FeedResult;
      }
    }),
  );

  return {
    results,
    configPath: getFeedConfigPath(),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFeedEntries(feed: FeedConfig): Promise<{
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
