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
    versionCode: 5,
    versionName: "1.3.0",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-22",
    mandatory: false,
    changelog: [
      "2-Task Live Wallpaper: Redesigned wallpaper displaying strictly Current Task (NOW) & Upcoming Task (NEXT) with breathing pulse beacon",
      "Mindful Rhythm App Redesign: Fluid obsidian slate aesthetic with Plus Jakarta Sans & JetBrains Mono typography",
      "Chrono Stream Planner: Complete 24h timeline with inline hour editing modal and instant Dexie DB binding",
      "Wallpaper Studio: Interactive 19.5:9 phone preview, clock overlay simulator, and dual alternate photo managers",
      "Habit Vault: Redesigned daily habits with reward vault and streak multiplier preservation",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
