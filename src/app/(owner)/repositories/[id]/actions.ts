"use server";

import { revalidatePath } from "next/cache";

import { STRATEGIES } from "@/lib/github/deploy-strategy";
import { requireOwner } from "@/lib/owner";
import { getConnectedRepo, setDeployStrategy } from "@/lib/repos";

/** Override (or reset to auto-detect) how a repo ships. */
export async function setShippingAction(formData: FormData) {
  await requireOwner();
  const repoId = String(formData.get("repoId") ?? "");
  const value = String(formData.get("strategy") ?? "auto");
  const repo = await getConnectedRepo(repoId);
  if (!repo) throw new Error("Unknown repository");

  const strategy = STRATEGIES.includes(value as (typeof STRATEGIES)[number]) ? value : null;
  await setDeployStrategy(repo.id, strategy);
  revalidatePath("/", "layout");
}
