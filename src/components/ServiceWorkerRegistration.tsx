"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Warm the knowledge-base cache on every app open (when online) so
        // /learn works fully in airplane mode later.
        const warm = () => {
          if (!navigator.onLine) return;
          (reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ type: "WARM_KB" });
        };
        if (reg.active) warm();
        else navigator.serviceWorker.ready.then(warm).catch(() => {});
      })
      .catch(() => {});
  }, []);
  return null;
}
