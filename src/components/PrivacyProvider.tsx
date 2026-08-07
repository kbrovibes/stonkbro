"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

type PrivacyContextValue = {
  /** True while the privacy lock is on — mask all wealth-revealing values. */
  locked: boolean;
  lock: () => Promise<void>;
  /** Returns an error message, or null on success. */
  unlock: (code: string) => Promise<string | null>;
};

const PrivacyContext = createContext<PrivacyContextValue>({
  locked: false,
  lock: async () => {},
  unlock: async () => null,
});

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export default function PrivacyProvider({
  initialLocked,
  children,
}: {
  initialLocked: boolean;
  children: React.ReactNode;
}) {
  // Cookie is httpOnly, so client state starts from the server-read value and
  // only changes through the API round-trips below.
  const [locked, setLocked] = useState(initialLocked);
  const router = useRouter();

  const lock = useCallback(async () => {
    try {
      const res = await fetch("/api/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      if (res.ok) {
        setLocked(true);
        router.refresh(); // re-render RSC pages with the lock cookie set
      }
    } catch {
      // network failure: leave state unchanged
    }
  }, [router]);

  const unlock = useCallback(
    async (code: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unlock", code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return data.error || "Unlock failed";
        setLocked(false);
        router.refresh();
        return null;
      } catch {
        return "Network error — try again";
      }
    },
    [router]
  );

  return (
    <PrivacyContext.Provider value={{ locked, lock, unlock }}>
      {children}
    </PrivacyContext.Provider>
  );
}
