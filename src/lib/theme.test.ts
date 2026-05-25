import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  storeTheme,
} from "./theme";

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("uses the light theme as the default", () => {
    expect(getStoredTheme()).toBe(DEFAULT_THEME);
    applyTheme(getStoredTheme());

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("persists and applies the dark theme without reloading", () => {
    storeTheme("dark");
    applyTheme(getStoredTheme());

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");

    expect(getStoredTheme()).toBe("light");
  });
});
