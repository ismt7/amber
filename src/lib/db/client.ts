import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();
let client: ReturnType<typeof postgres> | undefined;

let initPromise: Promise<void> | undefined;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is required for the Postgres database connection.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl);
}

function getClient() {
  if (!databaseUrl) {
    throw new DatabaseNotConfiguredError();
  }

  client ??= postgres(databaseUrl, {
    max: 1,
  });

  return client;
}

export function getDatabase() {
  return drizzle(getClient(), { schema });
}

export function ensureDatabase() {
  initPromise ??= getDatabase().execute(sql`
    CREATE TABLE IF NOT EXISTS feed_entries (
      feed_id TEXT NOT NULL,
      link TEXT NOT NULL,
      title TEXT NOT NULL,
      published_at TEXT,
      summary TEXT,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (feed_id, link)
    )
  `).then(() => undefined);

  return initPromise;
}
