import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import AlertBanner from "@/components/AlertBanner";
import OfflineBanner from "@/components/OfflineBanner";
import PrivacyProvider from "@/components/PrivacyProvider";
import BiometricLock from "@/components/BiometricLock";
import { getUser } from "@/lib/auth";
import { isPiiLocked } from "@/lib/privacy-server";
import { BIOMETRIC_LOCK_ENABLED } from "@/lib/feature-flags";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const isGuest = !user;
  // The invite-only gate now lives on the Portfolio page itself (a
  // request-access prompt for anyone not yet approved), not in the nav —
  // any signed-in user needs to be able to find it to ask.
  const showPortfolio = !isGuest;
  const piiLocked = await isPiiLocked();

  return (
    <PrivacyProvider initialLocked={piiLocked}>
      {/* Pre-paint check: hide the app shell before first paint when the
          device-local Face ID lock is enabled, so nothing flashes before
          BiometricLock hydrates and prompts. */}
      {BIOMETRIC_LOCK_ENABLED && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html:
                'try{var c=JSON.parse(localStorage.getItem("biometric-lock-v1")||"null");if(c&&c.enabled)document.documentElement.classList.add("bio-locked")}catch(e){}',
            }}
          />
          <style>{`html.bio-locked #bio-shell{visibility:hidden}`}</style>
        </>
      )}
      <BiometricLock>
      <Header />
      <OfflineBanner />
      {!isGuest && <AlertBanner />}
      <main className="flex flex-col flex-1 pt-16 pb-16 max-w-2xl mx-auto w-full">
        <PullToRefresh>
          {children}
        </PullToRefresh>
      </main>
      <BottomNav showPortfolio={showPortfolio} isGuest={isGuest} />
      </BiometricLock>
    </PrivacyProvider>
  );
}
