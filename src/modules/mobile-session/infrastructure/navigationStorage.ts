import {
  navigationOwner,
  parseNavigationSnapshot,
  restorableHref,
  type NavigationIdentity,
} from "../domain/navigation";

export const NAVIGATION_KEY = "cfo:navigation:v1";
export const NAVIGATION_OWNER_KEY = "cfo:navigation:owner";
export const NAVIGATION_CLEARED_EVENT = "cfo:navigation-cleared";

export function clearNavigationState() {
  for (const kind of ["sessionStorage", "localStorage"] as const) {
    try {
      window[kind].removeItem(NAVIGATION_KEY);
      window[kind].removeItem(NAVIGATION_OWNER_KEY);
    } catch {
      /* Storage is optional. */
    }
  }
  window.dispatchEvent(new Event(NAVIGATION_CLEARED_EVENT));
}

export function initializeNavigationOwner(identity: NavigationIdentity) {
  const owner = navigationOwner(identity);
  for (const kind of ["sessionStorage", "localStorage"] as const) {
    try {
      const storage = window[kind];
      if (storage.getItem(NAVIGATION_OWNER_KEY) !== owner) storage.removeItem(NAVIGATION_KEY);
      storage.setItem(NAVIGATION_OWNER_KEY, owner);
    } catch {
      /* Private mode/quota must not prevent opening the app. */
    }
  }
}

export function readNavigationState(identity: NavigationIdentity, relaunch = false) {
  try {
    // Per-tab context on reload; the last local snapshot only on an explicit PWA launch.
    const storage = relaunch ? window.localStorage : window.sessionStorage;
    if (storage.getItem(NAVIGATION_OWNER_KEY) !== navigationOwner(identity)) return null;
    return parseNavigationSnapshot(storage.getItem(NAVIGATION_KEY), identity);
  } catch {
    return null;
  }
}

export function saveNavigationState(identity: NavigationIdentity, href: string, scrollY: number) {
  const safeHref = restorableHref(href, identity);
  if (!safeHref) return;
  const owner = navigationOwner(identity);
  const snapshot = JSON.stringify({
    version: 1,
    owner,
    href: safeHref,
    scrollY: Math.max(0, Math.round(scrollY)),
    savedAt: Date.now(),
  });
  for (const kind of ["sessionStorage", "localStorage"] as const) {
    try {
      const storage = window[kind];
      // Do not recreate state after logout or a different account in another tab.
      if (storage.getItem(NAVIGATION_OWNER_KEY) === owner)
        storage.setItem(NAVIGATION_KEY, snapshot);
    } catch {
      /* Best effort; no sensitive data or dependency on disk storage. */
    }
  }
}
