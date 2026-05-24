import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import { createClient } from "@/lib/supabase-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const showPortfolio = user?.email === "k4rthikr@gmail.com";
  const isGuest = !user;

  return (
    <>
      <Header />
      <main className="flex flex-col flex-1 pt-16 pb-16 max-w-2xl mx-auto w-full">
        <PullToRefresh>
          {children}
        </PullToRefresh>
      </main>
      <BottomNav showPortfolio={showPortfolio} isGuest={isGuest} />
    </>
  );
}
