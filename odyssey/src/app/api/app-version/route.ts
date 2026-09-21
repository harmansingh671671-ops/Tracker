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
    versionCode: 3,
    versionName: "1.2.0",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-22",
    mandatory: false,
    changelog: [
      "XX:57 task cadence alerts with 'Roger that' action",
      "Tap 'Update Task' to open the exact hour edit modal directly",
      "Instant wallpaper auto-sync whenever tasks are edited",
      "Full dedicated profile page with custom motto & focus",
      "Seamless in-place update (0 data lost, no uninstall)",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
