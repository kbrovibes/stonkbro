import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function PlaysScreen() {
  return (
    <div className="w-[390px] h-[844px] bg-white flex flex-col select-none">
      <div className="h-12 px-6 pt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-stone-900">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-3 rounded-sm border-2 border-stone-700 overflow-hidden p-px">
            <div className="h-full w-4/5 bg-stone-700 rounded-sm" />
          </div>
        </div>
      </div>
      <div className="px-4 h-14 flex items-center justify-between border-b border-stone-100">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-extrabold tracking-tight text-stone-900">stonk</span>
          <span className="text-2xl font-display text-sky-600 leading-none -tracking-wide">BRO</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-bold">K</div>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">Today&apos;s Plays</h2>
          <span className="text-xs text-stone-400">Tue May 13</span>
        </div>
        {[
          { symbol: "NVDA", tag: "Earnings momentum", change: "+2.4%", pos: true },
          { symbol: "AAPL", tag: "Pre-earnings breakout", change: "+1.1%", pos: true },
          { symbol: "TSLA", tag: "Channel bounce", change: "+3.2%", pos: true },
          { symbol: "AMD", tag: "Volume surge", change: "+1.8%", pos: true },
        ].map((stock) => (
          <div key={stock.symbol} className="flex items-center gap-3 p-3.5 rounded-2xl border border-stone-100 bg-stone-50">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-stone-900 mb-0.5">{stock.symbol}</div>
              <div className="text-xs text-stone-500">{stock.tag}</div>
            </div>
            <span className={`text-sm font-bold ${stock.pos ? "text-emerald-600" : "text-red-500"}`}>{stock.change}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100 bg-white flex pb-8">
        {["Home", "Plays", "Options", "Research", "More"].map((name, i) => (
          <div key={name} className={`flex-1 pt-3 pb-1 flex flex-col items-center gap-1 text-[10px] font-medium ${i === 1 ? "text-sky-600" : "text-stone-400"}`}>
            <div className={`w-5 h-1.5 rounded-full ${i === 1 ? "bg-sky-500" : "bg-stone-200"}`} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

function OptionsScreen() {
  return (
    <div className="w-[390px] h-[844px] bg-white flex flex-col select-none">
      <div className="h-12 px-6 pt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-stone-900">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-3 rounded-sm border-2 border-stone-700 overflow-hidden p-px">
            <div className="h-full w-4/5 bg-stone-700 rounded-sm" />
          </div>
        </div>
      </div>
      <div className="px-4 h-14 flex items-center border-b border-stone-100">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-extrabold tracking-tight text-stone-900">stonk</span>
          <span className="text-2xl font-display text-sky-600 leading-none -tracking-wide">BRO</span>
        </div>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        <h2 className="text-base font-bold text-stone-900">Options Scanner</h2>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-semibold">CSP</span>
          <span className="px-3 py-1 rounded-full border border-stone-200 text-stone-400 text-xs">Covered Call</span>
        </div>
        {[
          { symbol: "TSLA", dte: "35 DTE", premium: "$2.45", delta: "0.25Δ", roc: "12.3%" },
          { symbol: "AMD",  dte: "28 DTE", premium: "$1.85", delta: "0.23Δ", roc: "10.8%" },
          { symbol: "NVDA", dte: "42 DTE", premium: "$4.20", delta: "0.28Δ", roc: "9.6%"  },
          { symbol: "COIN", dte: "21 DTE", premium: "$3.10", delta: "0.26Δ", roc: "14.2%" },
        ].map((opt) => (
          <div key={opt.symbol} className="p-3.5 rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">{opt.symbol}</span>
                <span className="text-xs text-stone-400">{opt.dte}</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">{opt.roc} ROC</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-stone-500">Premium <span className="font-semibold text-stone-800">{opt.premium}</span></div>
              <div className="text-xs text-stone-500">Delta <span className="font-semibold text-stone-800">{opt.delta}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100 bg-white flex pb-8">
        {["Home", "Plays", "Options", "Research", "More"].map((name, i) => (
          <div key={name} className={`flex-1 pt-3 pb-1 flex flex-col items-center gap-1 text-[10px] font-medium ${i === 2 ? "text-sky-600" : "text-stone-400"}`}>
            <div className={`w-5 h-1.5 rounded-full ${i === 2 ? "bg-sky-500" : "bg-stone-200"}`} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneMockup({ variant, tilt = 0, className = "" }: {
  variant: "plays" | "options";
  tilt?: number;
  className?: string;
}) {
  const SCALE = 0.462;
  const W = Math.round(390 * SCALE); // 180px
  const H = Math.round(844 * SCALE); // 390px

  return (
    <div className={`shrink-0 ${className}`} style={{ transform: `rotate(${tilt}deg)` }}>
      <div
        className="bg-stone-850 rounded-[2.25rem] p-[6px] pb-2 shadow-2xl"
        style={{ backgroundColor: "#1c1917", width: W + 12 }}
      >
        <div className="bg-white rounded-[1.85rem] overflow-hidden" style={{ width: W, height: H }}>
          <div style={{ width: 390, height: 844, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
            {variant === "plays" ? <PlaysScreen /> : <OptionsScreen />}
          </div>
        </div>
        <div className="flex justify-center pt-1.5 pb-0.5">
          <div className="w-14 h-[3px] bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-stone-200">
      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-xl font-extrabold tracking-tight text-stone-900">stonk</span>
            <span className="text-2xl font-display text-sky-600 leading-none">BRO</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
              Sign in
            </Link>
            <Link href="/today" className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors">
              Explore
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left: copy + CTAs */}
            <div className="flex-1 text-center lg:text-left max-w-lg mx-auto lg:mx-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold tracking-wide uppercase mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Live market data · Free to explore
              </span>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 leading-[1.1] tracking-tight mb-5">
                Find stocks<br />ready to move.
              </h1>

              <p className="text-base sm:text-lg text-stone-500 leading-relaxed mb-8 max-w-sm mx-auto lg:mx-0">
                Explosive stock discovery, automated options scanning, and AI-powered research — all in one mobile-first app.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
                >
                  <GoogleIcon />
                  Sign in with Google
                </Link>
                <Link
                  href="/today"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-stone-200 text-stone-700 text-sm font-semibold hover:border-stone-300 hover:bg-stone-50 transition-colors"
                >
                  Explore the app
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right: phone mockups */}
            <div className="flex-1 flex justify-center lg:justify-end items-end gap-5">
              <PhoneMockup variant="plays" tilt={-5} className="hidden sm:block" />
              <PhoneMockup variant="options" tilt={4} />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-5 bg-stone-50 border-t border-stone-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-stone-900 mb-2">Everything you need to trade smarter</h2>
            <p className="text-sm text-stone-500">Built for individual investors who want institutional-grade tools.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              }
              title="Daily Plays"
              description="AI-curated explosive stock setups with earnings catalysts, momentum signals, and technical analysis."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.696 1.16 5.242 0l.879-.659M9 8.818l.879-.659c1.546-1.16 3.696-1.16 5.242 0l.879.659M12 6V4m0 16v-2" />
                </svg>
              }
              title="Options Scanner"
              description="Find the highest-ROC CSP and covered call opportunities across hundreds of stocks in seconds."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              }
              title="AI Research"
              description="Claude-powered deep-dive analysis on any ticker — fundamentals, technicals, and options strategy."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-stone-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="text-sm font-extrabold text-stone-900">stonk</span>
            <span className="text-base font-display text-sky-600 leading-none">BRO</span>
          </Link>
          <p className="text-xs text-stone-400 text-center">Not financial advice. For informational purposes only.</p>
          <Link href="/login" className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors">
            Sign in →
          </Link>
        </div>
      </footer>
    </div>
  );
}
