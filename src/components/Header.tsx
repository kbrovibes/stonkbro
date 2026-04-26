import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-stone-900">
          stonkbro
        </Link>
        {user && (
          <div className="flex items-center gap-2">
            <LogoutButton />
            <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center text-xs font-bold text-white">
              {(user.user_metadata?.full_name || user.email || "")
                .split(/[\s@]/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s: string) => s[0].toUpperCase())
                .join("")}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
