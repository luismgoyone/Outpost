import { connectRepo, expect, test } from "./support/fixtures";

test("Overview shows attention tiles and repo health cards", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/billing");
  await page.goto("/overview");
  await expect(page.getByRole("heading", { level: 1, name: "Engineering Overview" })).toBeVisible();

  const failing = page.getByRole("region", { name: "Failing CI" });
  await expect(failing).toContainText(/\d+\s*active failures/);

  const card = page.getByRole("list", { name: "Repository health" }).getByRole("listitem", {
    name: "billing",
  });
  await expect(card).toContainText("v1.19.0");
  await expect(card).toContainText("Go");
  await expect(card).toContainText("private");
  await expect(card).toContainText("2 open");
  await expect(card).toContainText("Passing"); // main CI
  await expect(card).toContainText("75%"); // merge rate: 3 of 4 closed PRs merged
  await expect(card).toContainText(/Prod deploy\s*42m ago · Success/);
  await expect(card).toContainText("3 PRs/wk");
  await expect(
    card.getByRole("img", { name: /billing: pull requests opened per week/ }),
  ).toBeVisible();

  // Filter by name.
  await page.getByRole("searchbox", { name: "Filter repositories" }).fill("bill");
  await page.getByRole("searchbox", { name: "Filter repositories" }).press("Enter");
  await expect(page).toHaveURL(/q=bill/);
  await expect(
    page.getByRole("list", { name: "Repository health" }).getByRole("listitem"),
  ).toHaveCount(1);
});
