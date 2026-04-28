"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Intercept all link clicks to trigger loading state
  const handleClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // Skip external links, hash links, and same-page links
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
    if (href === pathname) return;

    setLoading(true);
    setProgress(0);
    setVisible(true);
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleClick]);

  // When pathname changes, navigation is complete
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate progress while loading
  useEffect(() => {
    if (!loading) return;

    // Quick jump to 30%
    const t1 = setTimeout(() => setProgress(30), 50);
    // Slow crawl to 70%
    const t2 = setTimeout(() => setProgress(60), 300);
    const t3 = setTimeout(() => setProgress(75), 800);
    const t4 = setTimeout(() => setProgress(85), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [loading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px]">
      <div
        className="h-full bg-sky-500 transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "600ms",
          boxShadow: "0 0 8px rgba(14, 165, 233, 0.4)",
        }}
      />
    </div>
  );
}
