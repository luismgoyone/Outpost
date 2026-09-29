import { describe, expect, it } from "vitest";

import { mapReleases, parseRange, pullRequestNumbers, withinRange } from "@/lib/github/releases";

const node = (tagName: string, publishedAt: string | null, extra = {}) => ({
  id: tagName,
  name: null,
  tagName,
  url: `https://github.com/acme/x/releases/tag/${tagName}`,
  publishedAt,
  createdAt: "2026-01-01T00:00:00Z",
  isLatest: false,
  isPrerelease: false,
  isDraft: false,
  description: null,
  author: null,
  ...extra,
});

describe("mapReleases", () => {
  it("drops drafts, sorts newest first and fills defaults", () => {
    const releases = mapReleases({
      repository: {
        releases: {
          nodes: [
            node("v1.0.0", "2026-09-01T00:00:00Z"),
            null,
            node("v1.1.0", "2026-09-10T00:00:00Z", {
              isLatest: true,
              name: "Autumn",
              description: "## Notes",
            }),
            node("v1.2.0-draft", null, { isDraft: true }),
            node("v0.9.0", null),
          ],
        },
      },
    });
    expect(releases.map((r) => r.tagName)).toEqual(["v1.1.0", "v1.0.0", "v0.9.0"]);
    expect(releases[0]).toMatchObject({ name: "Autumn", isLatest: true, notes: "## Notes" });
    expect(releases[1].name).toBe("v1.0.0");
    expect(releases[2].publishedAt).toBe("2026-01-01T00:00:00Z"); // falls back to createdAt
    expect(mapReleases({ repository: null })).toEqual([]);
  });
});

describe("pullRequestNumbers", () => {
  it("extracts unique (#N) references, highest first", () => {
    expect(
      pullRequestNumbers([
        "feat(auth): scopes (#284)",
        "fix(db): pool leak (#279)\n\nCo-authored-by: x",
        "Merge (#284) again",
        "chore: no pr",
        "refs #12 without parens",
      ]),
    ).toEqual([284, 279]);
  });
});

describe("time ranges", () => {
  const now = new Date("2026-09-29T00:00:00Z");
  it("filters by range", () => {
    expect(withinRange("2026-09-01T00:00:00Z", "30d", now)).toBe(true);
    expect(withinRange("2026-08-01T00:00:00Z", "30d", now)).toBe(false);
    expect(withinRange("2020-01-01T00:00:00Z", "all", now)).toBe(true);
  });
  it("parses with a 90-day default", () => {
    expect(parseRange(undefined)).toBe("90d");
    expect(parseRange("1y")).toBe("1y");
    expect(parseRange(["bogus"])).toBe("90d");
  });
});
