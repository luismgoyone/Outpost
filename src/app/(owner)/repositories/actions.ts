"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listInstallableRepos } from "@/lib/github/installations";
import { requireOwner } from "@/lib/owner";
import { connectRepo } from "@/lib/repos";

export async function connectRepoAction(formData: FormData) {
  await requireOwner();
  const fullName = String(formData.get("fullName") ?? "");

  // Only accept repos the App can actually see; never trust client-sent IDs.
  const repo = (await listInstallableRepos()).find((r) => r.fullName === fullName);
  if (!repo) throw new Error(`Repository ${fullName} is not available to the GitHub App`);

  const connected = await connectRepo(repo);
  // The shell's sidebar lists connected repos, so refresh the whole layout.
  revalidatePath("/", "layout");
  redirect(`/repositories/${connected.id}`);
}
