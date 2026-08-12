/**
 * 테마 규약 — step 2 의 토글 UI 와 layout.tsx 의 인라인 스크립트가 공유한다.
 * localStorage 에는 "light" | "dark" 만 저장하고, 값이 없으면 시스템 설정을 따른다.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const DARK_CLASS = "dark";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(): Theme | null {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : null;
}

function getSystemTheme(): Theme {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

/** 지금 적용해야 할 테마. 저장된 값이 우선, 없으면 시스템 설정. */
export function resolveTheme(): Theme {
  return readStoredTheme() ?? getSystemTheme();
}

/** 테마를 저장하고 즉시 적용한다. */
export function setTheme(theme: Theme): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
}
