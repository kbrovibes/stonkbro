"use client";

import { MORE_GROUPS, MoreTile } from "@/components/MoreNav";

export default function MorePage() {
  return (
    <div className="flex flex-col flex-1 px-3 py-4 gap-4">
      <h2 className="text-lg font-bold text-stone-900 px-1">More</h2>

      {MORE_GROUPS.map((group) => (
        <section key={group.label} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-stone-500">{group.icon}</span>
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">{group.label}</span>
            <span className="text-[10px] text-stone-400">{group.links.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {group.links.map((link) => (
              <MoreTile key={link.href} link={link} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
