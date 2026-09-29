import { connectRepo, expect, test } from "./support/fixtures";

test("My Work shows review requests, my PRs, stale PRs and failing branches", async ({
  page,
  signInAs,
}) => {
  await signInAs();
  await connectRepo(page, "acme/mobile");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "My Work" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "My Work" })).toBeVisible();

  const reviews = page.getByRole("list", { name: "Waiting on my review" });
  const offline = reviews.getByRole("listitem").filter({ hasText: "Offline sync queue" });
  await expect(offline).toContainText("mobile");
  await expect(offline.getByRole("link", { name: "Review" })).toHaveAttribute(
    "href",
    /\/pull\/40\/files$/,
  );

  const mine = page
    .getByRole("list", { name: "My pull requests" })
    .getByRole("listitem")
    .filter({ hasText: "Fix tray menu crash" });
  await expect(mine).toContainText("Changes requested");
  await expect(mine.getByRole("link", { name: "Resolve" })).toBeVisible();

  const stale = page
    .getByRole("list", { name: "Stale PRs in my repos" })
    .getByRole("listitem")
    .filter({ hasText: "Upgrade React Native to 0.74" });
  await expect(stale).toContainText("Stale: 12d");
  await expect(stale).toContainText("Failing");

  const failing = page
    .getByRole("list", { name: "Failing on default branch" })
    .getByRole("listitem")
    .filter({ hasText: "mobile" });
  await expect(failing).toContainText("Build fastlane iOS test suite");
  await expect(failing).toContainText("CI failing");
  await expect(failing).toContainText("mobile0");

  // Items from other repos may be present (tests share a database), so check at least ours.
  await expect(page.getByText(/\d+ need attention/)).toBeVisible();
});
