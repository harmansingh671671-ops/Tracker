"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import { sendTestNotificationToAndroid, checkForAppUpdate, downloadAndInstallNativeApk, getNativeAppVersion, isAndroidNativeApp } from "@/lib/utils/android-bridge";
import { X, Bell, Moon, Sun, Database, Download, Upload, CheckCircle, ShieldCheck, Smartphone, RefreshCw } from "lucide-react";

interface ProfileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsSheet({ isOpen, onClose }: ProfileSettingsSheetProps) {
  const { user, fetchUser } = useUserStore();
  const [hourlyAlertsEnabled, setHourlyAlertsEnabled] = useState(true);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [totalHabits, setTotalHabits] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nativeVersion, setNativeVersion] = useState<{ versionCode: number; versionName: string; isNative: boolean }>({
    versionCode: 0,
    versionName: "Web",
    isNative: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchUser();
      setNativeVersion(getNativeAppVersion());
      const saved = localStorage.getItem("odyssey_hourly_alerts");
      if (saved !== null) {
        setHourlyAlertsEnabled(saved === "true");
      }
      db.scheduleBlocks.count().then(setTotalBlocks);
      db.habits.count().then(setTotalHabits);
    }
  }, [isOpen, fetchUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleHourlyAlerts = (checked: boolean) => {
    setHourlyAlertsEnabled(checked);
    localStorage.setItem("odyssey_hourly_alerts", String(checked));
    showToast(checked ? "Hourly XX:57 Heads-Up Alerts enabled." : "Hourly alerts paused.");
  };

  const handleExportData = async () => {
    try {
      const blocks = await db.scheduleBlocks.toArray();
      const habits = await db.habits.toArray();
      const userData = await db.profiles.toCollection().first();
      const exportBlob = new Blob(
        [JSON.stringify({ blocks, habits, user: userData, exportedAt: new Date().toISOString() }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(exportBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `odyssey-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup JSON exported successfully.");
    } catch {
      showToast("Error exporting backup.");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.blocks && Array.isArray(json.blocks)) {
          await db.scheduleBlocks.clear();
          await db.scheduleBlocks.bulkAdd(json.blocks);
        }
        if (json.habits && Array.isArray(json.habits)) {
          await db.habits.clear();
          await db.habits.bulkAdd(json.habits);
        }
        showToast("Backup restored successfully!");
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        showToast("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleTestHourlyAlert = () => {
    sendTestNotificationToAndroid("NOW", "Deep Monotasking Sprint", "Focus");
    showToast("Sent XX:57 heads-up test alert via native engine.");
  };

  if (!isOpen) return null;

  const currentLevel = user?.level ?? 1;
  const currentXp = user?.xp ?? 420;
  const targetXp = currentLevel * 1000;
  const xpPercent = Math.min(100, Math.round((currentXp / targetXp) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-5 animate-in slide-in-from-bottom-6 duration-300"
      >
        {/* Top Drag Handle & Title */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 rounded-full bg-outline/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-on-surface">Profile & Settings</h2>
              <p className="text-xs text-on-surface-variant">Manage rhythm, notifications, and local vault</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Card with Level & XP */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-4 border border-outline/10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary via-primary-container to-secondary shadow-lg shadow-primary/20">
                <img
                  src="/logo.png"
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full bg-surface-container-lowest"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-container-lowest text-primary border border-primary/30 shadow">
                LVL {currentLevel}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-on-surface truncate">{user?.displayName || user?.username || "Odyssey Pilot"}</h3>
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                Scholar • Division II • {user?.streak ?? 1}d Streak
              </p>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-4 pt-1">
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-on-surface-variant">Progression to Lv. {currentLevel + 1}</span>
              <span className="text-primary font-semibold">{currentXp} / {targetXp} XP ({xpPercent}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500 shadow-sm shadow-primary/50"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hourly Notification Settings */}
        <div className="rounded-2xl bg-surface-container-low p-4 border border-outline/10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-on-surface">XX:57 Hourly Heads-Up Alert</h4>
                <p className="text-xs text-on-surface-variant">Pings 3 minutes before the next hour task starts</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={hourlyAlertsEnabled}
                onChange={(e) => handleToggleHourlyAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-surface-container peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-primary-container after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant text-xs w-full">
            <span>🛡️</span>
            <span className="truncate">Auto-silenced during Sleep hours (23:00 - 06:00)</span>
          </div>

          <button
            onClick={handleTestHourlyAlert}
            className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-mono font-medium text-tertiary transition-colors flex items-center justify-center gap-2"
          >
            <span>⚡ Send Test XX:57 Notification</span>
          </button>
        </div>

        {/* Circadian Sleep & Rhythm Boundaries */}
        <div className="rounded-2xl bg-surface-container-low p-4 border border-outline/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-on-surface">Circadian Rhythm & Boundaries</h4>
              <p className="text-xs text-on-surface-variant">Natural sleep and waking anchors</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-surface-container flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-1">
                <Sun className="w-3.5 h-3.5 text-tertiary" />
                <span>Start of Day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-mono text-on-surface">06:00</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">AM</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-1">
                <Moon className="w-3.5 h-3.5 text-secondary" />
                <span>Obsidian Rest</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-mono text-on-surface">23:00</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Local Vault & Storage */}
        <div className="rounded-2xl bg-surface-container-low p-4 border border-outline/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Local Vault Data</h4>
                <p className="text-xs text-on-surface-variant">Zero cloud dependency • 100% private</p>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-mono flex items-center justify-between">
            <span>Storage:</span>
            <span className="text-on-surface">{totalBlocks} Hours Planned • {totalHabits} Active Habits</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportData}
              className="py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <label className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import Backup</span>
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>
          </div>
        </div>

        {/* App Version & APK Updates */}
        <div className="rounded-2xl bg-surface-container-low p-4 border border-outline/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-on-surface">
                  {nativeVersion.isNative ? "Odyssey Android App" : "Odyssey Web App"}
                </h4>
                <p className="text-xs text-on-surface-variant font-mono">
                  {nativeVersion.isNative
                    ? `Installed: v${nativeVersion.versionName} (Release v1.3.1)`
                    : "v1.3.1 (Live Cloud Synced)"}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
              Live OTA Ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={async () => {
                showToast("Checking for newest release...");
                const res = await checkForAppUpdate();
                if (res && res.hasUpdate) {
                  window.dispatchEvent(new CustomEvent("odyssey:check-update-modal", { detail: res }));
                } else {
                  showToast("You are on the latest version (v1.3.1)!");
                }
              }}
              className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span>Check Updates</span>
            </button>
            <button
              onClick={() => {
                showToast("Downloading APK directly...");
                downloadAndInstallNativeApk("/downloads/odyssey-latest.apk");
              }}
              className="py-2.5 px-3 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </button>
          </div>
        </div>

        {/* Engine Diagnostics */}
        <div className="rounded-xl bg-surface-container-lowest p-3 border border-outline/5 text-xs text-on-surface-variant leading-relaxed">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-mono font-bold uppercase text-[11px] text-on-surface">Odyssey Engine Status</span>
          </div>
          <p className="font-mono text-[11px]">
            Hybrid Shell v1.3.1 • Vercel Instant Live Deployed • Battery Impact &lt;0.8%/day
          </p>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="p-3 rounded-xl bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Save & Close</span>
        </button>
      </div>
    </div>
  );
}
