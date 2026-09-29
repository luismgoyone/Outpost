"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, sectionFor } from "./nav-items";

export function SidebarNav({ counts }: { counts: Partial<Record<string, number>> }) {
  const active = sectionFor(usePathname());

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = active?.href === href;
        const count = counts[href];
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-sm border-l-2 px-2.5 transition-colors duration-100",
              isActive
                ? "border-primary bg-surface-hover text-primary font-medium"
                : "text-muted-foreground hover:bg-surface-hover/60 hover:text-foreground border-transparent",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  "ml-auto font-mono text-[10px]",
                  isActive ? "text-primary" : "text-subtle-foreground",
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
