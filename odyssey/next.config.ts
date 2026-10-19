import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PERF-5e: strip console.log/debug/info from production bundles. The app's
  // deliberate diagnostics (logWarn/logError -> console.warn/error) are kept:
  // they are the failure surface a device's logcat is read through.
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  async headers() {
    return [
      {
        source: "/downloads/:path*",
        headers: [
          {
            key: "Content-Disposition",
            value: 'attachment; filename="odyssey-latest.apk"',
          },
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
