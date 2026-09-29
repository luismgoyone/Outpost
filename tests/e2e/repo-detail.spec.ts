import { connectRepo, expect, test } from "./support/fixtures";

test.describe("repository detail", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/platform");
  });

  test("header shows visibility, language, health, release and branch", async ({ page }) => {
    const header = page.getByRole("region", { name: "Repository summary" });
    await expect(page.getByRole("heading", { level: 1, name: "acme/platform" })).toBeVisible();
    await expect(header).toContainText("Private");
    await expect(header).toContainText("TypeScript");
    await expect(header).toContainText("Latest release:v2.8.1");
    await expect(header).toContainText("Default branch:main");
    await expect(page.getByLabel("Default branch health")).toContainText("Passing");
  });

  test("tabs show workflows, deployments and releases", async ({ page }) => {
    const tabs = page.getByRole("navigation", { name: "Repository sections" });

    await tabs.getByRole("link", { name: "Workflows" }).click();
    await expect(page).toHaveURL(/tab=workflows/);
    await expect(tabs.getByRole("link", { name: "Workflows" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const ci = page.getByRole("row", { name: "CI / Test & Lint" });
    await expect(ci.getByRole("list", { name: /Last 10 runs/ }).getByRole("listitem")).toHaveCount(
      10,
    );
    await expect(ci).toContainText("90%"); // 1 failure in the last 10
    await expect(ci).toContainText("2m 14s");
    await expect(ci).toContainText("push");
    await expect(page.getByRole("row", { name: "Deploy to Production" })).toContainText("100%");

    await tabs.getByRole("link", { name: "Deployments" }).click();
    await expect(page).toHaveURL(/tab=deployments/);
    await expect(page.getByRole("region", { name: "Deployments" })).toContainText("release v2.8.1");

    await tabs.getByRole("link", { name: "Releases" }).click();
    await expect(page).toHaveURL(/tab=releases/);
    await expect(page.getByRole("listitem", { name: "platform v2.8.1" })).toContainText("Latest");
  });
});

test("workflows tab explains a missing Actions permission", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/docs");
  await page.goto(`${page.url()}?tab=workflows`);
  await expect(
    page.getByRole("alert").filter({ hasText: "Can't read GitHub Actions" }),
  ).toContainText('Actions to "Read-only"');
});
