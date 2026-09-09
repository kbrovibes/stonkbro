import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/db/admin";
import PaperLeaderboard from "./PaperLeaderboard";

export const dynamic = "force-dynamic";

export default async function PaperPage() {
  const user = await getUser();
  const admin = user ? await isAdmin(user.id).catch(() => false) : false;
  return <PaperLeaderboard isAdmin={admin} />;
}
