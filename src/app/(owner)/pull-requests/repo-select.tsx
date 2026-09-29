"use client";

import { useRouter } from "next/navigation";

export function RepoSelect({
  repos,
  value,
  hrefFor,
}: {
  repos: string[];
  value: string | null;
  hrefFor: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Repository"
      value={value ?? ""}
      onChange={(e) => router.push(hrefFor[e.target.value || "__all"])}
      className="bg-background text-foreground focus:border-primary h-7 rounded-sm border px-2 font-mono text-[11px] outline-none"
    >
      <option value="">All repos ({repos.length})</option>
      {repos.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
