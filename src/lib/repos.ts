import "server-only";

import { asc, eq } from "drizzle-orm";

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
