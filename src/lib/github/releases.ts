/** Releases across repos: query, mapping and pure helpers. I/O lives in fetch-releases.ts. */

export type Release = {
  id: string;
  name: string;
  tagName: string;
  url: string;
  publishedAt: string;
  isLatest: boolean;
  isPrerelease: boolean;
  author: string | null;
  /** Release notes as Markdown (rendered safely, never as raw HTML). */
  notes: string;
};

/** What changed since the previous release, from the compare API. */
export type ReleaseChanges = {
  commits: number;
  contributors: string[];
  pullRequests: number[];
  compareUrl: string;
  previousTag: string;
};

export const RELEASES_QUERY = /* GraphQL */ `
  query RepoReleases($owner: String!, $name: String!, $count: Int!) {
    repository(owner: $owner, name: $name) {
      releases(first: $count, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          id
          name
          tagName
          url
          publishedAt
          createdAt
          isLatest
          isPrerelease
          isDraft
          description
          author {
            login
          }
        }
      }
    }
  }
`;

type ReleaseNode = {
  id: string;
  name: string | null;
  tagName: string;
  url: string;
  publishedAt: string | null;
  createdAt: string;
  isLatest: boolean;
  isPrerelease: boolean;
  isDraft: boolean;
  description: string | null;
  author: { login: string } | null;
};

export type ReleasesQueryResult = {
  repository: { releases: { nodes: Array<ReleaseNode | null> | null } } | null;
};

/** Published releases only (drafts are private work in progress), newest first. */
export function mapReleases(result: ReleasesQueryResult): Release[] {
  return (result.repository?.releases.nodes ?? [])
    .filter((n): n is ReleaseNode => n !== null && !n.isDraft)
    .map((n) => ({
      id: n.id,
      name: n.name || n.tagName,
      tagName: n.tagName,
      url: n.url,
      publishedAt: n.publishedAt ?? n.createdAt,
      isLatest: n.isLatest,
      isPrerelease: n.isPrerelease,
      author: n.author?.login ?? null,
      notes: n.description ?? "",
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** PR numbers referenced in commit messages, e.g. squash merges "feat: x (#123)". */
export function pullRequestNumbers(messages: string[]): number[] {
  const numbers = new Set<number>();
  for (const message of messages) {
    for (const match of message.matchAll(/\(#(\d+)\)/g)) numbers.add(Number(match[1]));
  }
  return [...numbers].sort((a, b) => b - a);
}

export const RANGES = ["30d", "90d", "1y", "all"] as const;
export type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number | null> = { "30d": 30, "90d": 90, "1y": 365, all: null };

export function withinRange(publishedAt: string, range: Range, now: Date): boolean {
  const days = RANGE_DAYS[range];
  return days === null || now.getTime() - new Date(publishedAt).getTime() <= days * 86_400_000;
}

export function parseRange(value: string | string[] | undefined): Range {
  const v = Array.isArray(value) ? value[0] : value;
  return RANGES.includes(v as Range) ? (v as Range) : "90d";
}
