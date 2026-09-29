import { sql } from "drizzle-orm";

import { getDb } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Database health check. Reports the round-trip time from this function's region to
 * Postgres (first query includes opening the connection). No data is exposed.
 */
export async function GET() {
  const db = getDb();
  const timings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await db.execute(sql`select 1`);
    timings.push(Math.round(performance.now() - start));
  }
  return Response.json({
    ok: true,
    region: process.env.VERCEL_REGION ?? "local",
    firstQueryMs: timings[0],
    roundTripMs: Math.min(...timings.slice(1)),
  });
}
