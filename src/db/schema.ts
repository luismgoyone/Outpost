import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** A GitHub repo the owner has connected through the GitHub App. */
export const repos = pgTable("repos", {
  id: uuid("id").primaryKey().defaultRandom(),
  installationId: integer("installation_id").notNull(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  /** Optional Vercel project to pull deployments from (milestone 3). */
  vercelProjectId: text("vercel_project_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Read-only share links. Only the token's hash is stored (see src/lib/share/token.ts). */
export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("share_links_repo_idx").on(t.repoId)],
);

/** Cached GitHub/Vercel payloads, keyed per repo (milestone 6). */
export const statsCache = pgTable(
  "stats_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stats_cache_repo_key_idx").on(t.repoId, t.key)],
);
