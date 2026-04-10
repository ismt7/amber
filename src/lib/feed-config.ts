import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export type FeedConfig = {
  id: string;
  title: string;
  url: string;
  siteUrl?: string;
  limit: number;
  highlightKeywords: string[];
  filterKeywords: string[];
};

const FEED_CONFIG_PATH = path.join(process.cwd(), "feeds.yaml");

type ParsedFeedConfig = {
  defaultLimit?: number;
  highlightKeywords?: string[];
  filterKeywords?: string[];
  feeds?: Array<
    Partial<Omit<FeedConfig, "highlightKeywords" | "filterKeywords">> & {
      highlightKeywords?: string[];
      filterKeywords?: string[];
    }
  >;
};

export async function loadFeedConfig(): Promise<FeedConfig[]> {
  const yamlText = await readFile(FEED_CONFIG_PATH, "utf8");
  const parsed = parse(yamlText) as ParsedFeedConfig | null;

  if (!parsed?.feeds?.length) {
    throw new Error("feeds.yaml に feeds が定義されていません。");
  }

  const defaultLimit = normalizeLimit(parsed.defaultLimit);
  const defaultHighlightKeywords = normalizeKeywords(parsed.highlightKeywords);
  const defaultFilterKeywords = normalizeKeywords(parsed.filterKeywords);

  return parsed.feeds.map((feed, index) => {
    if (!feed.url || !feed.title) {
      throw new Error(`feeds.yaml の ${index + 1} 件目に title または url がありません。`);
    }

    return {
      id: feed.id?.trim() || `feed-${index + 1}`,
      title: feed.title.trim(),
      url: feed.url.trim(),
      siteUrl: feed.siteUrl?.trim(),
      limit: normalizeLimit(feed.limit, defaultLimit),
      highlightKeywords: mergeKeywords(defaultHighlightKeywords, feed.highlightKeywords),
      filterKeywords: mergeKeywords(defaultFilterKeywords, feed.filterKeywords),
    };
  });
}

export function getFeedConfigPath() {
  return FEED_CONFIG_PATH;
}

function normalizeLimit(limit?: number, fallback = 6) {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 20);
}

function normalizeKeywords(keywords?: string[]) {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))];
}

function mergeKeywords(baseKeywords: string[], extraKeywords?: string[]) {
  return [...new Set([...baseKeywords, ...normalizeKeywords(extraKeywords)])];
}
