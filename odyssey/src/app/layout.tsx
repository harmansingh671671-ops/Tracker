import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair-display",
});

export const metadata: Metadata = {
  title: "Odyssey - Habit & Schedule Tracker",
  description: "Accountability scheduler, habit tracker, journey map and performance analytics",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Odyssey",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* PERF-10a. These four lines fetched a Google-hosted icon font on every cold
            start - two preconnects plus a render-blocking stylesheet - for a font the app
            never used. All 45 icon-importing files draw with `lucide-react`; the
            `.material-symbols-outlined` class that referenced this font was applied by
            nothing and has been deleted alongside it.

            Inter and Playfair are unaffected: `next/font/google` above already downloads
            and self-hosts those at build time, so they were never an external fetch.

            Removing this is not a subsetting exercise. The font was dead, and the network
            cost was being paid anyway. */}
        {/* Anti-FOUC Theme Script: executes synchronously before DOM paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Must stay self-contained: this runs before any bundle is
                  // parsed, so readString/THEME_STORAGE_KEY/logWarn do not exist
                  // here. Key must match THEME_STORAGE_KEY in theme-store.ts.
                  var stored = localStorage.getItem('odyssey_theme_mode') || 'system';
                  var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var root = document.documentElement;
                  root.classList.toggle('dark', isDark);
                  root.classList.toggle('light', !isDark);
                  root.style.colorScheme = isDark ? 'dark' : 'light';
                } catch (e) { /* private mode / storage disabled */ }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfairDisplay.variable} min-h-screen flex flex-col text-on-surface font-body-md antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
