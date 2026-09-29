import "server-only";

import { and, asc, eq, ilike } from "drizzle-orm";

import { getDb } from "@/db";
import { repos, type Repo } from "@/db/schema";

export type RepoRef = { installationId: number; owner: string; name: string };

export async function listConnectedRepos(): Promise<Repo[]> {
  return getDb().select().from(repos).orderBy(asc(repos.owner), asc(repos.name));
}

export async function getConnectedRepo(id: string): Promise<Repo | undefined> {
  const [repo] = await getDb().select().from(repos).where(eq(repos.id, id)).limit(1);
  return repo;
}

/** Insert the repo, or refresh its installation ID if it's already connected. */
export async function connectRepo(ref: RepoRef): Promise<Repo> {
  const [repo] = await getDb()
    .insert(repos)
    .values(ref)
    .onConflictDoUpdate({
      target: [repos.owner, repos.name],
      set: { installationId: ref.installationId },
    })
    .returning();
  return repo;
}

/** Match a webhook's repository to a connected repo (GitHub names are case-insensitive). */
export async function findConnectedRepo(owner: string, name: string): Promise<Repo | undefined> {
  const [repo] = await getDb()
    .select()
    .from(repos)
    .where(and(ilike(repos.owner, owner), ilike(repos.name, name)))
    .limit(1);
  return repo;
}
