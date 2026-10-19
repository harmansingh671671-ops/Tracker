/**
 * PERF-7e — should this device get flat translucent backgrounds instead of
 * live `backdrop-filter` passes?
 *
 * The heuristics the plan names: `navigator.deviceMemory` (GB, capped by the
 * spec at 8) or `navigator.hardwareConcurrency`. A device that reports few
 * cores and little RAM is the device where 20+ live blur passes turn scrolling
 * into a slideshow. Pure so it can be tested; the caller passes whatever
 * `navigator` object the runtime has (in tests: a stub).
 */

export interface LowEndNavigator {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export function isLowEndDevice(nav: LowEndNavigator | undefined | null): boolean {
  if (!nav) return false;
  const { deviceMemory, hardwareConcurrency } = nav;
  // `deviceMemory: undefined` means Chrome hasn't exposed it (or the browser
  // never will); fall through to cores rather than treating "unknown" as low.
  if (typeof deviceMemory === "number" && deviceMemory > 0) {
    return deviceMemory <= 2;
  }
  if (typeof hardwareConcurrency === "number" && hardwareConcurrency > 0) {
    return hardwareConcurrency <= 2;
  }
  return false;
}
