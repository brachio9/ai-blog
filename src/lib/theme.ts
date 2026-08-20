/**
 * 테마 규약 — `ThemeToggle` 과 `layout.tsx` 의 인라인 스크립트가 공유한다.
 *
 * **밤이 기본 지면이고 낮은 명시적 선택이다.** `prefers-color-scheme` 을 보지 않는다.
 *
 * 액센트 채도·입체(`--edge-top`)·썸네일이 전부 밤에 맞춰 정해진다. OS 설정이 그걸 뒤집어
 * 낮을 기본으로 보여 주면, 노력의 일부만 들어간 지면이 첫 화면이 된다 — 반쯤 디자인된
 * 라이트 모드를 만드는 정확한 방법이다.
 *
 * 덤으로 흰 화면 번쩍임이 다수 경로에서 사라진다: 기본 경로(저장값 없음)에는 클래스 조작이
 * 아예 없어서, JS 가 꺼져 있어도 밤이 그려진다.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/** `<html>` 에 붙는 클래스. **밤에는 아무것도 안 붙는다** — 그게 기본이라는 뜻이다. */
export const LIGHT_CLASS = "light";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** 지금 적용해야 할 테마. 저장된 값이 없으면 밤이다 (시스템 설정을 보지 않는다). */
export function resolveTheme(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : "dark";
}

/**
 * 지금 그려진 지면. **클래스가 없으면 밤이다.**
 *
 * 네 곳(토글·다이어그램·댓글·테스트)이 같은 판정을 하므로 여기 하나만 둔다 —
 * 지면 기본값이 뒤집힌 개편에서 이 판정이 흩어져 있으면 한 곳씩 빠뜨리게 된다.
 */
export function currentTheme(): Theme {
  return document.documentElement.classList.contains(LIGHT_CLASS)
    ? "light"
    : "dark";
}

/** 테마를 저장하고 즉시 적용한다. */
export function setTheme(theme: Theme): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.classList.toggle(LIGHT_CLASS, theme === "light");
}
