"use server";

import { revalidatePath } from "next/cache";

import { invalidate } from "@/lib/cache";
import { fetchAllPullRequests } from "@/lib/github/fetch-all-pull-requests";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

/**
 * Header "Sync" button: drop every cached GitHub payload, then refetch pull requests right
 * away so the header and sidebar badges are current when the page re-renders. Other data
 * (deployments, releases, workflows) refetches on its next view.
 */
export async function syncNowAction() {
  await requireOwner();
  await invalidate();
  await fetchAllPullRequests(await listConnectedRepos());
  revalidatePath("/", "layout");
}
