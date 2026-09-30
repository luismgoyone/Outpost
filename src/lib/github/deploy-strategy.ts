/**
 * How a repo ships to production: on merge to the default branch, on a release tag, or
 * manually. Detected from GitHub Actions workflows and deployment history. Pure, so it's
 * unit-tested with real workflow configs.
 */
import YAML from "yaml";

import type { Deployment } from "./deployments";

export type Strategy = "merge" | "tag" | "manual" | "unknown";
export const STRATEGIES = ["merge", "tag", "manual"] as const;

export type WorkflowFile = {
  path: string;
  name: string;
  /** Normalized triggers. */
  triggers: {
    pushBranches: string[];
    pushTags: string[];
    release: boolean;
    manual: boolean;
  };
  deploySteps: string[];
  environments: string[];
};

export type DetectedStrategy = {
  strategy: Strategy;
  platform: string | null;
  /** Human-readable evidence, e.g. "deploy.yml runs on tags v*.*.*". */
  reason: string;
};

export type Unreleased = {
  sinceTag: string;
  commits: number;
  pullRequests: number[];
  compareUrl: string;
};

/** Commands and actions that push something to production. */
const DEPLOY_STEP =
  /vercel\s+deploy|netlify(-cli)?\s+deploy|deploy-pages|gh-pages|peaceiris\/actions-gh-pages|firebase\s+deploy|flyctl?\s+deploy|wrangler\s+(deploy|publish|pages)|railway\s+up|docker\s+push|docker\/build-push-action|npm\s+publish|pnpm\s+publish|gh\s+release\s+upload|cloudflare\/pages-action|amondnet\/vercel-action/i;

const PLATFORMS: Array<[RegExp, string]> = [
  [/vercel/i, "Vercel"],
  [/netlify/i, "Netlify"],
  [/deploy-pages|gh-pages|github-pages/i, "GitHub Pages"],
  [/firebase/i, "Firebase"],
  [/fly(ctl)?\s+deploy/i, "Fly.io"],
  [/wrangler|cloudflare/i, "Cloudflare"],
  [/railway/i, "Railway"],
  [/docker/i, "Docker registry"],
  [/npm\s+publish|pnpm\s+publish/i, "npm"],
];

function asList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function parseWorkflow(path: string, text: string): WorkflowFile | null {
  let doc: Record<string, unknown>;
  try {
    doc = YAML.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object") return null;

  // YAML 1.1 parsers can read a bare `on:` key as boolean true.
  const rawOn = (doc.on ?? (doc as Record<string, unknown>)["true"]) as unknown;
  const on: Record<string, unknown> =
    typeof rawOn === "string"
      ? { [rawOn]: null }
      : Array.isArray(rawOn)
        ? Object.fromEntries(rawOn.map((e) => [e, null]))
        : ((rawOn as Record<string, unknown>) ?? {});
  const push = (on.push ?? null) as Record<string, unknown> | null;

  const jobs = Object.values((doc.jobs ?? {}) as Record<string, Record<string, unknown>>);
  const steps = jobs.flatMap((job) =>
    ((job.steps ?? []) as Array<Record<string, unknown>>).map((s) =>
      [s.uses, s.run].filter((v) => typeof v === "string").join(" "),
    ),
  );
  const environments = jobs
    .map((job) =>
      typeof job.environment === "string"
        ? job.environment
        : ((job.environment as { name?: string } | undefined)?.name ?? ""),
    )
    .filter(Boolean);

  return {
    path,
    name: typeof doc.name === "string" ? doc.name : (path.split("/").pop() ?? path),
    triggers: {
      pushBranches: push ? asList(push.branches) : [],
      pushTags: push ? asList(push.tags) : [],
      release: "release" in on,
      manual: "workflow_dispatch" in on,
    },
    deploySteps: steps.filter((s) => DEPLOY_STEP.test(s)),
    environments,
  };
}

function isDeployWorkflow(w: WorkflowFile): boolean {
  return (
    w.deploySteps.length > 0 ||
    w.environments.some((e) => /prod|pages|live/i.test(e)) ||
    /deploy|release|publish/i.test(`${w.name} ${w.path}`)
  );
}

function platformOf(text: string): string | null {
  return PLATFORMS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function matchesBranch(pattern: string, branch: string): boolean {
  if (pattern === branch) return true;
  const regex = new RegExp(
    `^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, ".*")}$`,
  );
  return regex.test(branch);
}

const file = (w: WorkflowFile) => w.path.split("/").pop() ?? w.path;

export function detectStrategy(input: {
  workflows: WorkflowFile[];
  defaultBranch: string;
  deployments: Deployment[];
}): DetectedStrategy {
  const deploys = input.workflows.filter(isDeployWorkflow);
  const describe = (w: WorkflowFile) =>
    platformOf([w.name, w.path, ...w.deploySteps, ...w.environments].join(" "));

  // 1. A deploy workflow that runs on every push to the default branch.
  const onMerge = deploys.find((w) =>
    w.triggers.pushBranches.some((b) => matchesBranch(b, input.defaultBranch)),
  );
  if (onMerge) {
    return {
      strategy: "merge",
      platform: describe(onMerge),
      reason: `${file(onMerge)} runs on push to ${input.defaultBranch}`,
    };
  }

  // 2. A deploy workflow triggered by tags or published releases.
  const onTag = deploys.find((w) => w.triggers.pushTags.length > 0 || w.triggers.release);
  if (onTag) {
    const trigger =
      onTag.triggers.pushTags.length > 0
        ? `tags ${onTag.triggers.pushTags.join(", ")}`
        : "published releases";
    return {
      strategy: "tag",
      platform: describe(onTag),
      reason: `${file(onTag)} runs on ${trigger}`,
    };
  }

  // 3. Production deploys reported by a Git integration (Vercel, Netlify, Pages) deploy the
  //    production branch on every push.
  const production = input.deployments.filter((d) => d.environmentKind === "production");
  if (production.length > 0) {
    const platform = platformOf(production.map((d) => `${d.creator} ${d.environment}`).join(" "));
    return {
      strategy: "merge",
      platform,
      reason: `${platform ?? "Git integration"} deploys ${input.defaultBranch} to production`,
    };
  }
  const pages = input.deployments.find((d) => /github-pages/i.test(d.environment));
  if (pages) {
    return {
      strategy: "merge",
      platform: "GitHub Pages",
      reason: `GitHub Pages deploys ${input.defaultBranch}`,
    };
  }

  // 4. Deploy workflows that only run when started by hand.
  const manual = deploys.find((w) => w.triggers.manual);
  if (manual) {
    return {
      strategy: "manual",
      platform: describe(manual),
      reason: `${file(manual)} runs manually`,
    };
  }

  return {
    strategy: "unknown",
    platform: null,
    reason: "No deploy workflow or production deployments found",
  };
}

export const STRATEGY_LABEL: Record<Strategy, string> = {
  merge: "Merge to main",
  tag: "Release tag",
  manual: "Manual",
  unknown: "Unknown",
};

/** The label, using the repo's real default branch name. */
export function strategyLabel(strategy: Strategy, defaultBranch: string | null): string {
  return strategy === "merge" ? `Merge to ${defaultBranch ?? "main"}` : STRATEGY_LABEL[strategy];
}
