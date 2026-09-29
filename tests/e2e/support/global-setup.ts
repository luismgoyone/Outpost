import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { E2E } from "./env";

/** Migrate the throwaway e2e database and start every run from empty tables. */
export default async function globalSetup() {
  const pool = new Pool({ connectionString: E2E.databaseUrl });
  try {
    await pool.query("select 1");
  } catch (error) {
    throw new Error(
      `Can't reach the e2e database at ${E2E.databaseUrl}. Start it with "pnpm e2e:db".`,
      { cause: error },
    );
  }
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.query("truncate table repos cascade");
  await pool.end();
}
