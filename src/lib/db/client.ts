import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = resolveDatabaseUrl();
let client: ReturnType<typeof postgres> | undefined;

let initPromise: Promise<void> | undefined;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Postgres connection requires DATABASE_URL or POSTGRES_HOST/POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB (POSTGRES_PORT is optional).",
    );
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

function resolveDatabaseUrl() {
  const directUrl = getEnv("DATABASE_URL");
  if (directUrl) {
    return directUrl;
  }

  const host = getEnv("POSTGRES_HOST");
  const port = getEnv("POSTGRES_PORT") ?? "5432";
  const user = getEnv("POSTGRES_USER");
  const password = getEnv("POSTGRES_PASSWORD");
  const database = getEnv("POSTGRES_DB");

  if (!host || !user || !password || !database) {
    return undefined;
  }

  const url = new URL("postgres://localhost");
  url.hostname = host;
  url.port = port;
  url.username = user;
  url.password = password;
  url.pathname = `/${database}`;

  return url.toString();
}

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
