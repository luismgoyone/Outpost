"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sectionFor } from "./nav-items";

export function Breadcrumbs() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const isSectionRoot = section?.href === pathname;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Outpost</span>
      {section && (
        <>
          <span aria-hidden className="text-subtle-foreground">
            /
          </span>
          {isSectionRoot ? (
            <span aria-current="page" className="text-primary font-medium">
              {section.label}
            </span>
          ) : (
            <Link href={section.href} className="text-muted-foreground hover:text-foreground">
              {section.label}
            </Link>
          )}
        </>
      )}
    </nav>
  );
}
