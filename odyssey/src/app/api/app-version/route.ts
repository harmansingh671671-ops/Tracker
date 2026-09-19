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
    versionCode: 2,
    versionName: "1.1.0",
    apkUrl: `${origin}/downloads/odyssey-latest.apk`,
    releaseDate: "2026-09-19",
    mandatory: false,
    changelog: [
      "Smooth rounded card corners (54f) on Home & Lock screens",
      "Radiant glowing beacon indicator on horizontal timeline bar",
      "Always-visible hobbies section with flame streak counters",
      "Dynamic task name synchronization directly from the app",
      "Seamless in-app one-tap updates (no uninstalls required)",
    ],
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
