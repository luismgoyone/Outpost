import { expect, test } from "./support/fixtures";

test.describe("owner dashboard", () => {
  test("requires sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/api\/auth\/signin/);
    await expect(page.getByRole("button", { name: /sign in with github/i })).toBeVisible();
  });

  test("rejects a signed-in user who isn't the owner", async ({ page, signInAs }) => {
    await signInAs("someone-else");
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/?error=not-owner");
    await expect(page.getByRole("alert").filter({ hasText: "isn't the owner" })).toBeVisible();
  });

  test("connects a repo and lists its PRs with CI status", async ({ page, signInAs }) => {
    await signInAs();
    await page.goto("/dashboard");

    // Tests share one database and run in parallel, so only assert on this test's repo.
    const available = page.getByRole("list", { name: "Available repositories" });
    await expect(available).toContainText("acme/storefront");
    await page.getByRole("button", { name: "Connect acme/storefront" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "acme/storefront" })).toBeVisible();

    const open = page.getByRole("region", { name: "Open pull requests" });
    await expect(open.getByRole("row")).toHaveCount(4); // header + 3 PRs
    const rowFor = (title: string) => open.getByRole("row").filter({ hasText: title });
    await expect(rowFor("Checkout redesign")).toContainText("Passing");
    await expect(rowFor("Wishlist page")).toContainText("Running");
    await expect(rowFor("Wishlist page")).toContainText("Draft");
    await expect(rowFor("Upgrade payments SDK")).toContainText("Failing");

    const merged = page.getByRole("region", { name: "Recently merged" });
    await expect(merged).toContainText("Fix cart totals rounding");

    // Back on the dashboard, the repo moved from "available" to "connected".
    await page.getByRole("link", { name: "← Dashboard" }).click();
    await expect(
      page.getByRole("list", { name: "Connected repositories" }).getByRole("link", {
        name: "acme/storefront",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect acme/storefront" })).toHaveCount(0);
  });

  test("shows an empty state for a repo with no PRs", async ({ page, signInAs }) => {
    await signInAs();
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Connect acme/docs" }).click();
    await expect(page.getByText("No open pull requests.")).toBeVisible();
    await expect(page.getByText("Nothing merged yet.")).toBeVisible();
  });
});

test("repo pages don't leak repo names to visitors", async ({ page, signInAs, context }) => {
  await signInAs();
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Connect acme/storefront" })
    .or(page.getByRole("link", { name: "acme/storefront" }))
    .first()
    .click();
  await expect(page).toHaveURL(/\/repos\//);
  const repoUrl = page.url();

  await context.clearCookies();
  const response = await page.request.get(repoUrl, { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(await response.text()).not.toContain("storefront");
});
