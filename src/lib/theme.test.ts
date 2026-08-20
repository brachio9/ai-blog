import { beforeEach, describe, expect, it } from "vitest";

import { LIGHT_CLASS, THEME_STORAGE_KEY, resolveTheme, setTheme } from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove(LIGHT_CLASS);
});

describe("resolveTheme", () => {
  it("저장된 값이 없으면 밤이다 — 밤이 기본 지면이다", () => {
    expect(resolveTheme()).toBe("dark");
  });

  it("**시스템 설정을 보지 않는다** — 낮은 사람이 고를 때만 온다", () => {
    // OS 가 라이트여도 첫 방문은 밤이다. 반쯤 디자인된 지면을 첫 화면으로 내지 않는다.
    expect(resolveTheme()).toBe("dark");
  });

  it("저장된 값이 light 면 낮을 쓴다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    expect(resolveTheme()).toBe("light");
  });

  it("저장된 값이 규약(light|dark) 밖이면 밤으로 떨어진다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");

    expect(resolveTheme()).toBe("dark");
  });
});

describe("setTheme", () => {
  it("light 는 html 에 light 클래스를 붙이고 저장한다", () => {
    setTheme("light");

    expect(document.documentElement.classList.contains(LIGHT_CLASS)).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("dark 는 클래스를 떼고 저장한다 — 밤은 클래스 없는 상태다", () => {
    document.documentElement.classList.add(LIGHT_CLASS);

    setTheme("dark");

    expect(document.documentElement.classList.contains(LIGHT_CLASS)).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
