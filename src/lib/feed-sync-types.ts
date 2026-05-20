export type FeedDescriptor = {
  id: string;
  title: string;
  url: string;
  siteUrl?: string;
  limit: number;
  highlightKeywords: string[];
  filterKeywords: string[];
};

export type FeedEntry = {
  title: string;
  link: string;
  publishedAt?: string;
  summary?: string;
  matchedHighlightKeywords: string[];
};

export type FeedSyncResult = {
  feed: FeedDescriptor;
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
