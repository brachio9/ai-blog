import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DARK_CLASS, THEME_STORAGE_KEY, resolveTheme, setTheme } from "./theme";

/** jsdom 에는 matchMedia 가 없으므로 시스템 설정을 흉내낸다. */
function stubSystemPrefersDark(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({ matches }));
}

describe("resolveTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_CLASS);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("저장된 값이 dark 면 dark 를 쓴다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    stubSystemPrefersDark(false);

    expect(resolveTheme()).toBe("dark");
  });

  it("저장된 값이 light 면 시스템이 dark 여도 light 를 쓴다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    stubSystemPrefersDark(true);

    expect(resolveTheme()).toBe("light");
  });

  it("저장된 값이 없으면 시스템 설정을 따른다", () => {
    stubSystemPrefersDark(true);
    expect(resolveTheme()).toBe("dark");

    stubSystemPrefersDark(false);
    expect(resolveTheme()).toBe("light");
  });

  it("저장된 값이 규약(light|dark) 밖이면 시스템 설정을 따른다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    stubSystemPrefersDark(true);

    expect(resolveTheme()).toBe("dark");
  });
});

describe("setTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_CLASS);
  });

  it("dark 는 html 에 dark 클래스를 붙이고 저장한다", () => {
    setTheme("dark");

    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("light 는 dark 클래스를 떼고 저장한다", () => {
    document.documentElement.classList.add(DARK_CLASS);

    setTheme("light");

    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
