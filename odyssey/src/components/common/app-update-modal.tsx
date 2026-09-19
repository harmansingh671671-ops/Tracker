"use client";

import { useEffect, useState } from "react";
import {
  checkForAppUpdate,
  downloadAndInstallNativeApk,
  isAndroidApp,
  type AppUpdateCheckResult,
} from "@/lib/utils/android-bridge";
import { Sparkles, Download, X, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    // Only run update check if on client AND running inside the native Android APK
    if (typeof window === "undefined" || !isAndroidApp()) return;

    let mounted = true;
    const check = async () => {
      try {
        const res = await checkForAppUpdate();
        if (mounted && res && res.hasUpdate) {
          setUpdateInfo(res);
        }
      } catch (err) {
        console.warn("App update check skipped:", err);
      }
    };

    // Small delay to prioritize initial view render
    const timer = setTimeout(check, 2000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!updateInfo || isDismissed) return null;

  const handleUpdate = () => {
    setIsDownloading(true);
    const initiated = downloadAndInstallNativeApk(updateInfo.apkUrl);
    if (!initiated) {
      const a = document.createElement("a");
      a.href = updateInfo.apkUrl;
      a.download = "odyssey-latest.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Release spinner after 10s so user can re-try or open directly
    setTimeout(() => {
      setIsDownloading(false);
    }, 10000);
  };

  return (
    <aside
      role="region"
      aria-label="Application Update Notice"
      className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="p-4 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/10 text-on-surface font-mono space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">Odyssey Update Available</span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  v{updateInfo.latestVersionName}
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant">
                Current: v{updateInfo.currentVersionName} • In-Place Update (0 Data Lost)
              </span>
            </div>
          </div>

          {!updateInfo.mandatory && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Changelog Highlights */}
        {updateInfo.changelog && updateInfo.changelog.length > 0 && (
          <div className="p-2.5 rounded-xl bg-surface-container/80 border border-outline/10 text-[11px] space-y-1.5">
            <span className="text-[10px] font-bold text-primary block">What&apos;s New:</span>
            <ul className="space-y-1 text-on-surface-variant text-[10.5px]">
              {updateInfo.changelog.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-tight">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] text-on-surface-variant/60 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Keeps your habits &amp; streaks</span>
            </span>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-md shadow-primary/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
              <span>{isDownloading ? "Downloading..." : "⚡ Update Now"}</span>
            </button>
          </div>

          {/* Fallback direct download link */}
          <div className="flex justify-between items-center text-[9.5px] text-on-surface-variant/70 px-0.5">
            <span>Check top notification bar for progress</span>
            <a
              href={updateInfo.apkUrl}
              download="odyssey-latest.apk"
              className="underline text-primary hover:text-primary-container"
            >
              Direct APK link
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
