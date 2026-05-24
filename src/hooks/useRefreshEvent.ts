"use client";

import { useEffect } from "react";

export function useRefreshEvent(onRefresh: () => void) {
  useEffect(() => {
    window.addEventListener("pwa:refresh", onRefresh);
    return () => window.removeEventListener("pwa:refresh", onRefresh);
  }, [onRefresh]);
}
