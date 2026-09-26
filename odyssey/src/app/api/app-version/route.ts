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
    versionCode: 6,
    versionName: "1.3.1",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-26",
    mandatory: false,
    changelog: [
      "2-Task Live Wallpaper 1:1 Parity: Perfectly aligned native lockscreen & live wallpaper with Wallpaper Studio preview",
      "Breathing Beacon & Glowing Ring: Smooth pulse indicator on the active task and 24h spectrum timeline",
      "Dynamic Schedule Sync: Instant background broadcast updates whenever tasks or habits change",
      "ColorOS / Oppo & Multi-vendor Compatibility: Streamlined wallpaper picker and dual-screen restoration fallback",
      "Bugfixes & Performance: Zero-drain background wake locks and optimized canvas rendering",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
