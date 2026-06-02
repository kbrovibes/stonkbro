import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Black_Ops_One, Space_Grotesk } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import NavigationProgress from "@/components/NavigationProgress";
import ThemeFontProvider from "@/components/ThemeFontProvider";
import ThemeProvider from "@/components/ThemeProvider";
import { PRE_PAINT_THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const blackOpsOne = Black_Ops_One({
  variable: "--font-black-ops",
  subsets: ["latin"],
  weight: "400",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "stonkBRO",
  description: "Explosive stock discovery + options strategy automation",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "stonkBRO",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} ${blackOpsOne.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#FAFAF9" />
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider />
        <ThemeFontProvider />
        <NavigationProgress />
        {children}
        <ServiceWorkerRegistration />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
