import {
  FolderGit2,
  GitPullRequest,
  LayoutGrid,
  Rocket,
  Settings,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Sidebar order follows the Stitch design. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/my-work", label: "My Work", icon: UserRound },
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/deployments", label: "Deployments", icon: Rocket },
  { href: "/releases", label: "Releases", icon: Tag },
  { href: "/repositories", label: "Repositories", icon: FolderGit2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function sectionFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
