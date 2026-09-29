import { expect, test } from "./support/fixtures";

const SCREENS = [
  { label: "My Work", path: "/my-work", issue: "#13" },
  { label: "Overview", path: "/overview", issue: "#6" },
  { label: "Deployments", path: "/deployments", issue: "#4" },
  { label: "Releases", path: "/releases", issue: "#5" },
  { label: "Settings", path: "/settings", issue: "#16" },
];

test("sidebar navigates every section and marks the active one", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/repositories");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: /Repositories/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  for (const screen of SCREENS) {
    await nav.getByRole("link", { name: screen.label }).click();
    await expect(page).toHaveURL(screen.path);
    await expect(page.getByRole("heading", { level: 1, name: screen.label })).toBeVisible();
    await expect(page.getByText(`Tracked in ${screen.issue}`)).toBeVisible();
    await expect(nav.getByRole("link", { name: screen.label })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("every section requires sign-in", async ({ page }) => {
  for (const path of [...SCREENS.map((s) => s.path), "/pull-requests"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/api\/auth\/signin/);
  }
});

test("old routes redirect to the new ones", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/repositories");
});
