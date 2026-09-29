import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { requireEnv } from "@/lib/env";

import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

let db: Db | undefined;

/**
 * Lazily create one pooled client per process, so builds and tests don't need
 * DATABASE_URL. Works with Neon (pooled URL) and plain Postgres alike.
 */
export function getDb(): Db {
  if (!db) {
    const pool = new Pool({ connectionString: requireEnv("DATABASE_URL"), max: 5 });
    // Lets Vercel Fluid Compute close idle connections before suspending the instance.
    attachDatabasePool(pool);
    db = drizzle(pool, { schema });
  }
  return db;
}
