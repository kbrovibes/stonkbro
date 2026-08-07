import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import AlertBanner from "@/components/AlertBanner";
import OfflineBanner from "@/components/OfflineBanner";
import PrivacyProvider from "@/components/PrivacyProvider";
import { getUser } from "@/lib/auth";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { isPiiLocked } from "@/lib/privacy-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const showPortfolio = hasPortfolioAccess(user?.email);
  const isGuest = !user;
  const piiLocked = await isPiiLocked();

  return (
    <PrivacyProvider initialLocked={piiLocked}>
      <Header />
      <OfflineBanner />
      {!isGuest && <AlertBanner />}
      <main className="flex flex-col flex-1 pt-16 pb-16 max-w-2xl mx-auto w-full">
        <PullToRefresh>
          {children}
        </PullToRefresh>
      </main>
      <BottomNav showPortfolio={showPortfolio} isGuest={isGuest} />
    </PrivacyProvider>
  );
}
