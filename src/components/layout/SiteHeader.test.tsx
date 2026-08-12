import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATEGORIES, categoryHref } from "@/lib/categories";

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

  it("CATEGORIES 의 모든 카테고리를 링크로 그린다", () => {
    render(<SiteHeader />);
    const nav = within(screen.getByRole("navigation", { name: "카테고리" }));

    for (const category of CATEGORIES) {
      const link = nav.getByRole("link", { name: category.name });
      expect(link.getAttribute("href")).toBe(categoryHref(category));
    }

    expect(nav.getAllByRole("link")).toHaveLength(CATEGORIES.length);
  });

  it("현재 경로의 카테고리만 활성 표시한다", () => {
    const active = CATEGORIES[1];
    pathname.current = categoryHref(active);

    render(<SiteHeader />);

    for (const category of CATEGORIES) {
      const link = screen.getByRole("link", { name: category.name });
      expect(link.getAttribute("aria-current")).toBe(
        category.slug === active.slug ? "page" : null,
      );
    }
  });

  it("글 상세 경로에서도 상위 카테고리를 활성 표시한다", () => {
    const active = CATEGORIES[0];
    pathname.current = `${categoryHref(active)}/2026-08-12-hello`;

    render(<SiteHeader />);

    const link = screen.getByRole("link", { name: active.name });
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("테마 토글 버튼을 포함한다", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("button", { name: /전환/ })).toBeTruthy();
  });
});
