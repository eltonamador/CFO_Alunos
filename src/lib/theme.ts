export const THEME_STORAGE_KEY = "cfo-alunos-theme";
export const THEMES = ["light", "dark"] as const;
export const DEFAULT_THEME: ThemePreference = "light";

export type ThemePreference = (typeof THEMES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function getStoredTheme(storage: Storage | undefined = getLocalStorage()): ThemePreference {
  if (!storage) return DEFAULT_THEME;

  const value = storage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(value) ? value : DEFAULT_THEME;
}

export function storeTheme(theme: ThemePreference, storage: Storage | undefined = getLocalStorage()) {
  storage?.setItem(THEME_STORAGE_KEY, theme);
}

export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function getLocalStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
