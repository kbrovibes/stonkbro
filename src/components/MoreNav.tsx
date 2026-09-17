"use client";

import Link from "next/link";
import { type MoreLink } from "@/components/more-nav-data";

export type { MoreLink, MoreGroup } from "@/components/more-nav-data";
export { getVisibleMoreGroups, MORE_GROUPS } from "@/components/more-nav-data";

export function MoreTile({ link, onClick }: { link: MoreLink; onClick?: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className="aspect-square rounded-lg border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-1 flex flex-col items-center justify-center gap-0.5 text-center hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-accent-bg active:bg-sky-100 transition-colors min-w-0"
    >
      <span className="text-base leading-none">{link.emoji}</span>
      <span className="text-[9px] font-semibold text-stone-900 dark:text-text leading-tight line-clamp-2 w-full">{link.title}</span>
    </Link>
  );
}
