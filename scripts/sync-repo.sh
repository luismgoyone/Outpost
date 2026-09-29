#!/usr/bin/env bash
# Apply repo.config.json and Outpost's repo settings to GitHub. Safe to re-run.
#
#   pnpm sync-repo            # current repo (from the git remote)
#   REPO=owner/name pnpm sync-repo
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/repo.config.json"

command -v gh >/dev/null || { echo "error: gh CLI not found (https://cli.github.com)" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: run 'gh auth login' first" >&2; exit 1; }
[[ -f "$CONFIG" ]] || { echo "error: $CONFIG not found" >&2; exit 1; }

# Read a value from repo.config.json (node ships with the project; jq may not).
cfg() { node -e "const c=require(process.argv[1]); const v=$1; process.stdout.write(typeof v==='string'?v:JSON.stringify(v))" "$CONFIG"; }

REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
DEFAULT_BRANCH="$(cfg c.defaultBranch)"
echo "Syncing settings for $REPO"

# 1. Default branch, merge strategy, branch cleanup, description, homepage.
if ! gh api "repos/$REPO/branches/$DEFAULT_BRANCH" --silent 2>/dev/null; then
  echo "error: branch '$DEFAULT_BRANCH' does not exist on $REPO; push it first" >&2
  exit 1
fi
gh api --method PATCH "repos/$REPO" --silent \
  -f default_branch="$DEFAULT_BRANCH" \
  -F delete_branch_on_merge=true \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=COMMIT_MESSAGES \
  -f description="$(cfg c.description)" \
  -f homepage="$(cfg c.homepage)"
echo "✓ default branch '$DEFAULT_BRANCH', squash-only (PR title), delete branch on merge"
echo "✓ description and homepage"

# 2. Topics (replaces the full set, so removals in the config take effect too).
cfg '({names: c.topics})' | gh api --method PUT "repos/$REPO/topics" --input - --silent
echo "✓ topics: $(cfg 'c.topics.join(", ")')"

# 3. Branch protection. Private repos on the Free plan can't use it: skip with a message.
PROTECTION="$(cfg '({
  required_status_checks: { strict: false, contexts: c.branchProtection.requiredChecks },
  enforce_admins: c.branchProtection.enforceAdmins,
  required_pull_request_reviews: { required_approving_review_count: c.branchProtection.requiredApprovals },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false
})')"
if out="$(echo "$PROTECTION" | gh api --method PUT "repos/$REPO/branches/$DEFAULT_BRANCH/protection" --input - 2>&1 >/dev/null)"; then
  echo "✓ branch protection on '$DEFAULT_BRANCH': PR required, checks required: $(cfg 'c.branchProtection.requiredChecks.join(", ")')"
elif grep -qiE "upgrade to github pro|make this repository public|not available|HTTP 403" <<<"$out"; then
  echo "⚠ skipped branch protection: your GitHub plan doesn't allow it for this repo."
  echo "  Make the repo public or upgrade to GitHub Pro/Team, then re-run 'pnpm sync-repo'."
else
  echo "error: branch protection failed: $out" >&2
  exit 1
fi

echo "Done."
