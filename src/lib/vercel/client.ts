import { requireEnv } from "@/lib/env";

const VERCEL_API = "https://api.vercel.com";

/** Minimal typed fetch against the Vercel REST API. */
export async function vercelFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(path, VERCEL_API);
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${requireEnv("VERCEL_TOKEN")}` },
  });
  if (!res.ok) throw new Error(`Vercel API ${res.status} on ${url.pathname}`);
  return (await res.json()) as T;
}
