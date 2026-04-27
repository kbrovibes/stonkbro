import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/db/admin";
import ProfileMenu from "./ProfileMenu";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const initials = user
    ? (user.user_metadata?.full_name || user.email || "")
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s: string) => s[0].toUpperCase())
        .join("")
    : "";

  const adminFlag = user ? await isAdmin(user.id) : false;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-100">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-center relative">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-3xl font-extrabold tracking-tight text-stone-900">stonk</span>
          <span className="text-4xl font-display text-sky-600 -tracking-wide leading-none">BRO</span>
        </Link>
        {user && (
          <div className="absolute right-4">
            <ProfileMenu initials={initials} email={user.email || ""} isAdmin={adminFlag} />
          </div>
        )}
      </div>
    </header>
  );
}
