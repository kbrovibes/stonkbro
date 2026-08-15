import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/db/admin";
import ProfileMenu from "./ProfileMenu";
import JobsIndicator from "./JobsIndicator";
import { version } from "../../package.json";

export default async function Header() {
  const user = await getUser();

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated border-b border-border-subtle">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-center relative">
        <Link href="/" className="flex flex-col items-center">
          <span className="flex items-baseline gap-0.5">
            <span className="text-5xl font-extrabold tracking-tight text-text leading-none">stonk</span>
            <span className="text-4xl font-black text-brand -tracking-wide leading-none">BRO</span>
          </span>
          <span className="text-[9px] font-medium text-text-faint leading-none mt-0.5">v{version}</span>
        </Link>
        <div className="absolute right-4 flex items-center gap-1">
          {user ? (
            <>
              <JobsIndicator />
              <ProfileMenu initials={initials} email={user.email || ""} isAdmin={adminFlag} />
            </>
          ) : (
            <a
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
