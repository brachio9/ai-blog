import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATEGORIES } from "@/lib/categories";

import { SiteHeader } from "./SiteHeader";

/** usePathname 은 라우터가 없는 테스트 환경에서 동작하지 않으므로 값을 갈아끼운다. */
const { pathname } = vi.hoisted(() => ({ pathname: { current: "/" } }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("들어가는 문 셋만 그린다 — 분류를 늘어놓지 않는다", () => {
    render(<SiteHeader />);
    const nav = within(screen.getByRole("navigation", { name: "둘러보기" }));

    expect(
      nav.getAllByRole("link").map((link) => [
        link.textContent,
        link.getAttribute("href"),
      ]),
    ).toEqual([
      ["주제", "/topics"],
      ["출처", "/sources"],
      ["아카이브", "/archive"],
    ]);
  });

  it("카테고리를 머리에 늘어놓지 않는다", () => {
    // 다섯 칸 중 둘이 합쳐 5편이고 머리에는 편수를 적을 자리가 없다 —
    // 「커뮤니티」라는 낱말만으로는 4편인지 400편인지 알 수 없었다.
    // 편수는 /sources 와 /topics 가 막대와 숫자로 말한다.
    render(<SiteHeader />);

    for (const category of CATEGORIES) {
      expect(screen.queryByRole("link", { name: category.name })).toBeNull();
    }
  });

  it("현재 경로의 문만 활성 표시한다", () => {
    pathname.current = "/sources";

    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "출처" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "주제" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("한 단계 아래 경로에서도 그 문이 활성이다", () => {
    pathname.current = "/topics/serving";

    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "주제" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("테마 토글 버튼을 포함한다", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("button", { name: /전환/ })).toBeTruthy();
  });
});
