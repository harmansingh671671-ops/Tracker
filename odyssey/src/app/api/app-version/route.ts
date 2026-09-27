import { NextResponse } from "next/server";

export interface AppVersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseDate: string;
  mandatory: boolean;
  changelog: string[];
}

export async function GET(request: Request) {
  let origin = "https://odyssey-dun-rho.vercel.app";
  try {
    const url = new URL(request.url);
    if (url.origin && !url.origin.includes("localhost") && !url.origin.includes("127.0.0.1")) {
      origin = url.origin;
    }
  } catch {}

  const versionData: AppVersionInfo = {
    versionCode: 8,
    versionName: "1.3.3",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-27",
    mandatory: false,
    changelog: [
      "Smart Live Date Engine: Automatically opens today's live schedule on app start and midnight rollover",
      "Date-Specific Native Notifications: XX:57 background task cadence alerts strictly target today's live tasks",
      "Multi-Day Native Sync: Tomorrow's evening planning automatically synchronizes with native lockscreen and live wallpapers",
      "Smooth Quick Schedule Stream: Stable 24h inline hourly editing without focus interruptions",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
