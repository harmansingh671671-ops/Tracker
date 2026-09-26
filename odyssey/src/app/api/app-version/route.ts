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
    versionCode: 7,
    versionName: "1.3.2",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-26",
    mandatory: false,
    changelog: [
      "Redesigned Live Wallpaper: Full-width horizontal habit cards with large emojis and zero text clipping",
      "Stitch OLED Dark Obsidian Styling: Radiant 24h spectrum beacon and elevated active task cards",
      "Streamlined Experience: Exactly-once update notification with instant 1-tap download",
      "Performance & Fluidity: Zero startup delay and optimized lockscreen canvas rendering",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
