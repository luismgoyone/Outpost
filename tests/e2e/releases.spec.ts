import { connectRepo, expect, test } from "./support/fixtures";

test.describe("releases", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/platform");
  });

  test("shows a release timeline with changes since the previous tag", async ({ page }) => {
    await page.goto("/releases?repo=platform");
    const timeline = page.getByRole("list", { name: "Release timeline" });
    // Draft hidden, v2.7.0 is outside the default 90-day range.
    // Count timeline entries only, not the bullet lists inside release notes.
    await expect(timeline.getByRole("listitem", { name: /^platform v/ })).toHaveCount(2);

    const latest = timeline.getByRole("listitem", { name: "platform v2.8.1" });
    await expect(latest).toContainText("Latest");
    await expect(latest).toContainText("4 PRs included");
    await expect(latest).toContainText("18 commits");
    await expect(latest).toContainText("3 contributors");
    await expect(latest.getByRole("strong")).toHaveText("feat(auth):");
    await expect(latest.getByRole("link", { name: "Compare with v2.8.0" })).toHaveAttribute(
      "href",
      "https://github.com/acme/platform/compare/v2.8.0...v2.8.1",
    );
    // The oldest shown release has no previous tag in range of the query → no compare stats.
    await expect(timeline.getByRole("listitem", { name: "platform v2.8.0" })).toContainText(
      "1 commit",
    );
  });

  test("never executes HTML or javascript: links from release notes", async ({ page }) => {
    await page.goto("/releases?repo=platform");
    const latest = page.getByRole("listitem", { name: "platform v2.8.1" });
    await expect(latest).toContainText("What's changed");
    await expect(latest).not.toContainText("<script>");
    expect(await page.evaluate(() => (window as { __pwned?: boolean }).__pwned)).toBeUndefined();
    await expect(latest.locator("script")).toHaveCount(0);
    const link = latest.getByRole("link", { name: "click me" });
    expect(await link.getAttribute("href")).not.toMatch(/^javascript:/i);
  });

  test("time range includes older releases", async ({ page }) => {
    await page.goto("/releases?repo=platform");
    await page
      .getByRole("navigation", { name: "Time range" })
      .getByRole("link", { name: "All time" })
      .click();
    await expect(page).toHaveURL(/range=all/);
    await expect(
      page
        .getByRole("list", { name: "Release timeline" })
        .getByRole("listitem", { name: /^platform v/ }),
    ).toHaveCount(3);
  });
});
