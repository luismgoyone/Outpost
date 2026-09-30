import { signWebhookBody } from "../../src/lib/github/webhook-signature";

import { E2E, mockGitHubUrl } from "./support/env";
import { connectRepo, expect, test } from "./support/fixtures";

async function pullQueryCalls(repo: string): Promise<number> {
  const res = await fetch(`${mockGitHubUrl}/__calls?repo=${repo}`);
  return ((await res.json()) as { calls: number }).calls;
}

test("serves GitHub data from the cache until Sync", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/cachey");
  await expect(page.getByText("Cached PR")).toBeVisible();
  const repoUrl = page.url();
  const before = await pullQueryCalls("cachey");
  expect(before).toBeGreaterThan(0);

  await page.goto(repoUrl);
  await page.goto("/pull-requests?repo=cachey");
  await expect(page.getByText("Cached PR")).toBeVisible();
  expect(await pullQueryCalls("cachey")).toBe(before); // served from cache

  await expect(page.getByRole("status").filter({ hasText: /Synced/ })).toContainText(
    /Synced (just now|\dm ago)/,
  );
  await page.getByRole("button", { name: "Sync" }).click();
  // While syncing: spinner label, disabled button.
  await expect(page.getByRole("status").filter({ hasText: "Syncing…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Syncing" })).toBeDisabled();
  await expect.poll(() => pullQueryCalls("cachey")).toBeGreaterThan(before);
  await expect(page.getByRole("button", { name: "Sync", exact: true })).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: /Synced/ })).toContainText("just now");
});

test("sidebar shows PR and My Work counts from the cache", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/cachey");
  await page.goto("/pull-requests");
  await page.reload();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: /Pull Requests\s*\d+/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: /My Work\s*\d+/ })).toBeVisible();
});

test.describe("GitHub webhook", () => {
  const url = "/api/github/webhook";
  const body = JSON.stringify({
    action: "opened",
    repository: { name: "infra", owner: { login: "acme" } },
  });

  test("rejects unsigned or badly signed deliveries", async ({ request }) => {
    const unsigned = await request.post(url, {
      data: body,
      headers: { "x-github-event": "pull_request", "content-type": "application/json" },
    });
    expect(unsigned.status()).toBe(401);
    const forged = await request.post(url, {
      data: body,
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signWebhookBody("wrong-secret", body),
        "content-type": "application/json",
      },
    });
    expect(forged.status()).toBe(401);
  });

  test("a signed event invalidates that repo's cache", async ({ page, signInAs, request }) => {
    await signInAs();
    await connectRepo(page, "acme/infra");
    await expect(page.getByText("Infra PR")).toBeVisible();
    const repoUrl = page.url();
    const before = await pullQueryCalls("infra");

    const delivery = await request.post(url, {
      data: body,
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signWebhookBody(E2E.webhookSecret, body),
        "content-type": "application/json",
      },
    });
    expect(delivery.status()).toBe(202);
    expect(await delivery.json()).toEqual({ invalidated: "acme/infra" });

    await page.goto(repoUrl);
    await expect(page.getByText("Infra PR")).toBeVisible();
    expect(await pullQueryCalls("infra")).toBeGreaterThan(before);
  });

  test("answers pings and ignores unrelated events", async ({ request }) => {
    const sign = (b: string) => signWebhookBody(E2E.webhookSecret, b);
    const ping = await request.post(url, {
      data: "{}",
      headers: { "x-github-event": "ping", "x-hub-signature-256": sign("{}") },
    });
    expect(ping.status()).toBe(200);
    const star = await request.post(url, {
      data: "{}",
      headers: { "x-github-event": "star", "x-hub-signature-256": sign("{}") },
    });
    expect(star.status()).toBe(202);
  });
});
