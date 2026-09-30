import { describe, expect, it } from "vitest";

import type { Deployment } from "@/lib/github/deployments";
import {
  detectStrategy,
  parseWorkflow,
  strategyLabel,
  type WorkflowFile,
} from "@/lib/github/deploy-strategy";

// Fixtures modelled on the owner's real repos.
const CI = `
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  checks:
    steps:
      - run: npm ci
      - run: npm run build
`;

const PAGES_ON_MAIN = `
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  release:
    types: [published]
  workflow_dispatch:
jobs:
  deploy:
    environment:
      name: github-pages
    steps:
      - uses: actions/upload-pages-artifact@v3
      - uses: actions/deploy-pages@v4
`;

const NETLIFY_ON_TAG = `
name: Deploy on Release Tag
on:
  push:
    tags: ["v*.*.*"]
jobs:
  deploy:
    steps:
      - run: npm run build
      - run: npx netlify-cli deploy --prod --dir=dist
`;

const VERCEL_ON_RELEASE = `
name: release
on:
  release:
    types: [published]
  workflow_dispatch: {}
jobs:
  deploy:
    steps:
      - run: npm i -g vercel@latest
      - run: vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
`;

const MANUAL_ONLY = `
name: Deploy
on: workflow_dispatch
jobs:
  deploy:
    steps:
      - run: flyctl deploy
`;

const wf = (path: string, text: string) => parseWorkflow(path, text) as WorkflowFile;
const prodDeploy = {
  environmentKind: "production",
  environment: "Production",
  creator: "vercel",
} as Deployment;

describe("parseWorkflow", () => {
  it("normalizes triggers, deploy steps and environments", () => {
    expect(wf(".github/workflows/deploy.yml", PAGES_ON_MAIN)).toEqual({
      path: ".github/workflows/deploy.yml",
      name: "Deploy to GitHub Pages",
      triggers: { pushBranches: ["main"], pushTags: [], release: true, manual: true },
      deploySteps: ["actions/deploy-pages@v4"],
      environments: ["github-pages"],
    });
    expect(wf("x.yml", MANUAL_ONLY).triggers).toEqual({
      pushBranches: [],
      pushTags: [],
      release: false,
      manual: true,
    });
  });

  it("returns null for invalid YAML", () => {
    expect(parseWorkflow("bad.yml", "on: [unclosed")).toBeNull();
  });
});

describe("detectStrategy", () => {
  it("Vercel Git integration with CI only → merge (Outpost, personal-website)", () => {
    expect(
      detectStrategy({
        workflows: [wf("ci.yml", CI)],
        defaultBranch: "master",
        deployments: [prodDeploy],
      }),
    ).toEqual({
      strategy: "merge",
      platform: "Vercel",
      reason: "Vercel deploys master to production",
    });
  });

  it("Pages workflow on push to main → merge, even though it also runs on release", () => {
    expect(
      detectStrategy({
        workflows: [wf("ci.yml", CI), wf(".github/workflows/deploy.yml", PAGES_ON_MAIN)],
        defaultBranch: "main",
        deployments: [],
      }),
    ).toEqual({
      strategy: "merge",
      platform: "GitHub Pages",
      reason: "deploy.yml runs on push to main",
    });
  });

  it("Netlify on tags → tag (ot-tracker)", () => {
    expect(
      detectStrategy({
        workflows: [wf("ci.yml", CI), wf(".github/workflows/deploy.yml", NETLIFY_ON_TAG)],
        defaultBranch: "main",
        deployments: [],
      }),
    ).toEqual({ strategy: "tag", platform: "Netlify", reason: "deploy.yml runs on tags v*.*.*" });
  });

  it("Vercel CLI on published release → tag, ignoring preview-only Git deploys (Northmark)", () => {
    const preview = {
      environmentKind: "preview",
      environment: "Preview",
      creator: "vercel",
    } as Deployment;
    expect(
      detectStrategy({
        workflows: [wf("ci.yml", CI), wf(".github/workflows/release.yml", VERCEL_ON_RELEASE)],
        defaultBranch: "main",
        deployments: [preview],
      }),
    ).toEqual({
      strategy: "tag",
      platform: "Vercel",
      reason: "release.yml runs on published releases",
    });
  });

  it("deploy workflow that only runs by hand → manual", () => {
    expect(
      detectStrategy({
        workflows: [wf(".github/workflows/deploy.yml", MANUAL_ONLY)],
        defaultBranch: "main",
        deployments: [],
      }),
    ).toMatchObject({ strategy: "manual", platform: "Fly.io" });
  });

  it("CI on push to main is not a deploy → unknown without other evidence", () => {
    expect(
      detectStrategy({ workflows: [wf("ci.yml", CI)], defaultBranch: "main", deployments: [] })
        .strategy,
    ).toBe("unknown");
  });

  it("matches wildcard branch patterns", () => {
    const wildcard = wf(
      "deploy.yml",
      PAGES_ON_MAIN.replace("branches: [main]", "branches: ['release/*']"),
    );
    expect(
      detectStrategy({ workflows: [wildcard], defaultBranch: "release/prod", deployments: [] })
        .strategy,
    ).toBe("merge");
  });
});

describe("strategyLabel", () => {
  it("uses the real default branch", () => {
    expect(strategyLabel("merge", "master")).toBe("Merge to master");
    expect(strategyLabel("tag", "main")).toBe("Release tag");
  });
});
