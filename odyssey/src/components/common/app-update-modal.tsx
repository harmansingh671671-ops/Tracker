"use client";

import { useEffect, useState } from "react";
import { Sparkles, Download, X, ArrowUpCircle, CheckCircle2, RefreshCw, Smartphone } from "lucide-react";
import { checkForAppUpdate, downloadAndInstallNativeApk, isAndroidNativeApp, AppUpdateCheckResult } from "@/lib/utils/android-bridge";

/**
 * AppUpdateModal
 *
 * Checks for newer APK releases in the background strictly inside the native Android APK.
 * Never runs or displays on regular web browsers.
 */
export function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    // 1. Strictly ignore regular Web Browser users (zero network request & zero delay)
    if (!isAndroidNativeApp()) return;

    let mounted = true;

    async function check() {
      try {
        const result = await checkForAppUpdate();
        if (!mounted || !result || !result.hasUpdate) return;

        // Check if dismissed in this session
        const dismissed = sessionStorage.getItem(`odyssey_dismissed_update_${result.latestVersionCode}`);
        if (dismissed && !result.mandatory) {
          return;
        }

        setUpdateInfo(result);
        setIsOpen(true);
      } catch {}
    }

    // Run in idle background time without stalling app load
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => check(), { timeout: 2000 });
    } else {
      setTimeout(check, 1000);
    }

    // Listen for custom trigger event (e.g. from Settings "Check for Updates")
    const handleManualCheck = (e: Event) => {
      const customEvent = e as CustomEvent<AppUpdateCheckResult>;
      if (customEvent.detail) {
        setUpdateInfo(customEvent.detail);
        setIsOpen(true);
      } else {
        check();
      }
    };

    window.addEventListener("odyssey:check-update-modal", handleManualCheck);

    return () => {
      mounted = false;
      window.removeEventListener("odyssey:check-update-modal", handleManualCheck);
    };
  }, []);

  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    const success = downloadAndInstallNativeApk(updateInfo.apkUrl);
    
    setTimeout(() => {
      setIsDownloading(false);
      if (success) {
        setDownloadSuccess(true);
      }
    }, 1500);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(`odyssey_dismissed_update_${updateInfo.latestVersionCode}`, "true");
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-surface-container-low rounded-t-3xl sm:rounded-3xl border border-primary/20 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/30 to-emerald-500/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/10">
              <Sparkles className="w-6 h-6 animate-pulse text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                  Update Ready
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant">
                  v{updateInfo.currentVersionName} → <strong className="text-on-surface font-bold">v{updateInfo.latestVersionName}</strong>
                </span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mt-0.5">
                New Odyssey Version
              </h3>
            </div>
          </div>

          {!updateInfo.mandatory && (
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="rounded-2xl bg-surface-container/70 p-4 border border-outline/10 space-y-2.5">
          <h4 className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-primary">
            <Smartphone className="w-3.5 h-3.5" />
            What&apos;s New in v{updateInfo.latestVersionName}
          </h4>
          <div className="space-y-1.5">
            {updateInfo.changelog.map((item, idx) => (
              <div key={idx} className="text-xs text-on-surface-variant flex items-start gap-2 leading-relaxed">
                <span className="text-primary shrink-0 text-sm leading-tight">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status / Success notice */}
        {downloadSuccess ? (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Download initiated! Open your notification shade or browser downloads to install.</span>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline/5 text-[11px] text-on-surface-variant font-mono flex items-center justify-between">
            <span>Direct APK installation</span>
            <span className="text-primary font-semibold">~11.8 MB</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Starting Download...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-5 h-5" />
                <span>Download & Install v{updateInfo.latestVersionName}</span>
              </>
            )}
          </button>

          {!updateInfo.mandatory && (
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors"
            >
              Remind Me Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
