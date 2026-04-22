import { createClient } from "@/lib/supabase-server";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-extrabold tracking-tight text-stone-900">
          stonkbro
        </h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:block">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
