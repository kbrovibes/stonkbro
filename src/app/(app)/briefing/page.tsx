import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { getLatestBriefings } from "@/lib/db/briefings";
import type { DailyBriefing } from "@/lib/briefing/types";
import BriefingPlayer from "@/components/briefing/BriefingPlayer";

export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const user = await getUser();
  if (!user || !hasPortfolioAccess(user.email)) redirect("/home");

  let briefings: DailyBriefing[] = [];
  try {
    briefings = await getLatestBriefings();
  } catch {
    // Empty state handles it — the player offers a generate CTA.
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-text">Daily Briefing</h1>
        <p className="text-xs text-stone-400 dark:text-text-faint">
          Your pre-market audio update — portfolio moves, news, and today&apos;s trades
        </p>
      </div>
      <BriefingPlayer initialBriefings={briefings} />
    </div>
  );
}
