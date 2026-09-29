import { connectRepo, expect, test } from "./support/fixtures";

test.describe("pull requests across repos", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/api");
    await connectRepo(page, "acme/legacy");
  });

  test("lists PRs with CI, review state, staleness and ownership", async ({ page }) => {
    await page.goto("/pull-requests?repo=api");
    const table = page.getByRole("region", { name: "Open pull requests" });
    const rowFor = (title: string) => table.getByRole("row").filter({ hasText: title });

    await expect(table.getByRole("row")).toHaveCount(5); // header + 4
    await expect(rowFor("Migrate notifications stream")).toContainText("You");
    await expect(rowFor("Migrate notifications stream")).toContainText("2 approvals");
    await expect(rowFor("Deprecate legacy v1 auth endpoints")).toContainText("Stale: 18d");
    await expect(rowFor("Deprecate legacy v1 auth endpoints")).toContainText("Awaiting review");
    await expect(rowFor("Add request rate limiter")).toContainText("Failing");
    await expect(rowFor("Add request rate limiter")).toContainText("Changes requested");
    await expect(rowFor("Spike: gRPC transport")).toContainText("Draft");

    // Oldest first by default; the sort toggle flips it.
    await expect(table.getByRole("row").nth(1)).toContainText("Deprecate legacy v1");
    await page.getByRole("link", { name: /Sorted by/ }).click();
    await expect(page).toHaveURL(/sort=newest/);
    await expect(table.getByRole("row").nth(1)).toContainText("Spike: gRPC transport");
  });

  test("filters by view with counts", async ({ page }) => {
    await page.goto("/pull-requests?repo=api");
    const filters = page.getByRole("navigation", { name: "Filters" });
    const table = page.getByRole("region", { name: "Open pull requests" });

    await expect(filters.getByRole("link", { name: /Mine/ })).toContainText("1");
    await filters.getByRole("link", { name: /Mine/ }).click();
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText("Migrate notifications stream");

    await filters.getByRole("link", { name: /Needs review/ }).click();
    await expect(table.getByRole("row")).toHaveCount(2); // drafts and decided PRs excluded
    await expect(table).toContainText("Deprecate legacy v1 auth endpoints");

    await filters.getByRole("link", { name: /Failing CI/ }).click();
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText("Add request rate limiter");

    await filters.getByRole("link", { name: /Stale/ }).click();
    await expect(page).toHaveURL(/view=stale/);
    await expect(table).toContainText("Deprecate legacy v1 auth endpoints");
  });

  test("repo picker scopes the list", async ({ page }) => {
    await page.goto("/pull-requests");
    await page.getByRole("combobox", { name: "Repository" }).selectOption("api");
    await expect(page).toHaveURL(/repo=api/);
    await expect(
      page.getByRole("region", { name: "Open pull requests" }).getByRole("row"),
    ).toHaveCount(5);
  });

  test("a repo that fails to load is reported, not fatal", async ({ page }) => {
    await page.goto("/pull-requests");
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't load" })).toContainText(
      "legacy",
    );
    await expect(page.getByRole("region", { name: "Open pull requests" })).toBeVisible();
  });
});
