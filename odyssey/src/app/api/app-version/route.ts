import { NextResponse } from "next/server";
import { logWarn } from "@/lib/utils/logger";
import { localDateStr } from "@/lib/utils/local-date";
import versionConfig from "../../../../version.json";

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
  } catch (e) { logWarn("route", "could not determine origin from request URL", e); }

  const versionCode = versionConfig.versionCode || 8;

  const versionData: AppVersionInfo = {
    versionCode,
    versionName: versionConfig.versionName || "1.3.3",
    // The file name never changes between releases, so a CDN or browser holding
    // the previous APK would hand back the OLD build right after the version
    // check announced a new one. The version query makes each release a
    // distinct cache entry; the static path itself still resolves unchanged.
    apkUrl: `${origin}/downloads/odyssey-latest.apk?v=${versionCode}`,
    releaseDate: versionConfig.releaseDate || localDateStr(),
    mandatory: Boolean(versionConfig.mandatory),
    changelog: Array.isArray(versionConfig.changelog) ? versionConfig.changelog : [
      "Smart Live Date Engine: Automatically opens today's live schedule on app start and midnight rollover",
      "Date-Specific Native Notifications: XX:57 background task cadence alerts strictly target today's live tasks",
      "Multi-Day Native Sync: Tomorrow's evening planning automatically synchronizes with native lockscreen and live wallpapers",
      "Smooth Quick Schedule Stream: Stable 24h inline hourly editing without focus interruptions",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
