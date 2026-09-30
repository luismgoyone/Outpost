import { connectRepo, expect, test } from "./support/fixtures";

test.describe("how repos ship", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/platform");
    await connectRepo(page, "acme/marketing");
  });

  test("detects release-tag and merge-based repos, with evidence", async ({ page }) => {
    await page.goto("/deployments");
    const panel = page.getByRole("list", { name: "How each repo ships" });

    const platform = panel.getByRole("listitem", { name: "platform" });
    await expect(platform).toContainText("Release tag");
    await expect(platform).toContainText("Vercel");
    await expect(platform).toContainText("release.yml runs on published releases");
    await expect(platform.getByRole("link", { name: /not released since v2\.8\.1/ })).toContainText(
      "1 commit (1 PR)",
    );

    // No deploy workflow, but Vercel reports production deploys → deploys on merge.
    const marketing = panel.getByRole("listitem", { name: "marketing" });
    await expect(marketing).toContainText("Merge to main");
    await expect(marketing).toContainText("Vercel deploys main to production");
  });

  test("deployment activity has its own Environment column", async ({ page }) => {
    await page.goto("/deployments?repo=marketing");
    const table = page.getByRole("region", { name: "Deployment activity" });
    await expect(table.getByRole("columnheader", { name: "Environment" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Repository" })).toBeVisible();
  });

  test("Overview cards show how each repo ships", async ({ page }) => {
    await page.goto("/overview");
    const card = page
      .getByRole("list", { name: "Repository health" })
      .getByRole("listitem", { name: "platform" });
    await expect(card).toContainText("Ships via");
    await expect(card).toContainText("Release tag");
  });
});

test("the owner can override the detected strategy", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/docs");
  const shipsVia = page.getByLabel("How this repo ships");
  await expect(shipsVia).toContainText("Unknown");

  await page.getByRole("combobox", { name: "Deploy strategy" }).selectOption("tag");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(shipsVia).toContainText("Release tag");
  await expect(shipsVia).toContainText("Set by you");

  await page.getByRole("combobox", { name: "Deploy strategy" }).selectOption("auto");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(shipsVia).toContainText("Unknown");
  await expect(shipsVia).not.toContainText("Set by you");
});
