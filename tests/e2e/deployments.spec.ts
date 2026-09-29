import { connectRepo, expect, test } from "./support/fixtures";

test.describe("deployments", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/marketing");
  });

  test("lists deployments with environment, commit, duration and status", async ({ page }) => {
    await page.goto("/deployments?repo=marketing");
    const table = page.getByRole("region", { name: "Deployment activity" });
    const rowFor = (text: string) => table.getByRole("row").filter({ hasText: text });

    await expect(table.getByRole("row")).toHaveCount(5); // header + 4
    const prod = rowFor("update enterprise tier");
    await expect(prod).toContainText("Production");
    await expect(prod).toContainText("1m 24s");
    await expect(prod).toContainText("Deployed");
    await expect(prod.getByRole("link", { name: "Visit marketing Production" })).toHaveAttribute(
      "href",
      "https://mk1.example.app",
    );
    await expect(rowFor("webhook retry")).toContainText("Building");
    await expect(rowFor("webhook retry")).toContainText("feat/stripe");
    await expect(rowFor("zero-rate timeouts")).toContainText("Failed");
    await expect(rowFor("old preview")).toContainText("Superseded");
    // Newest first.
    await expect(table.getByRole("row").nth(1)).toContainText("webhook retry");
  });

  test("filters by environment and status", async ({ page }) => {
    await page.goto("/deployments?repo=marketing");
    const table = page.getByRole("region", { name: "Deployment activity" });

    await page
      .getByRole("navigation", { name: "Environment" })
      .getByRole("link", { name: "Staging" })
      .click();
    await expect(page).toHaveURL(/env=staging/);
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText("zero-rate timeouts");

    await page
      .getByRole("navigation", { name: "Environment" })
      .getByRole("link", { name: "All environments" })
      .click();
    await page
      .getByRole("navigation", { name: "Status" })
      .getByRole("link", { name: /Failed \(1\)/ })
      .click();
    await expect(page).toHaveURL(/status=failure/);
    await expect(table.getByRole("row")).toHaveCount(2);
  });

  test("Overview counts the failed staging deploy", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("region", { name: "Failed deployments" })).toContainText(
      "marketing (staging)",
    );
  });
});
