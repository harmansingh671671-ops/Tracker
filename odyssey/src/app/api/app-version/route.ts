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
    versionCode: 4,
    versionName: "1.2.1",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-22",
    mandatory: false,
    changelog: [
      "Smooth Live Wallpaper: Fixed freezing so glowing pulse continues seamlessly when schedule updates",
      "Reliable Cadence Alerts: Fixed background XX:57 notification delivery on Android 13/14",
      "Test Notification Trigger: Instantly test alerts with 'Roger that' & 'Update Task'",
      "Wallpaper Restoration: Restores your original phone wallpaper when turning off schedule wallpaper",
      "Seamless In-App Update: All habits and streak data preserved without uninstalling",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
