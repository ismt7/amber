import { primaryKey, pgTable, text } from "drizzle-orm/pg-core";

export const feedEntries = pgTable("feed_entries", {
  feedId: text("feed_id").notNull(),
  link: text("link").notNull(),
  title: text("title").notNull(),
  publishedAt: text("published_at"),
  summary: text("summary"),
  fetchedAt: text("fetched_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.feedId, table.link] }),
}));

export type InsertFeedEntry = typeof feedEntries.$inferInsert;
export type SelectFeedEntry = typeof feedEntries.$inferSelect;
