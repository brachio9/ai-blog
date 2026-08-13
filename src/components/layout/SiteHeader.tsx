"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchIcon } from "@/components/ui/icons";
import { CATEGORIES, categoryHref } from "@/lib/categories";
import { SITE_NAME } from "@/lib/site";

import { Container } from "./Container";
import { ThemeToggle } from "./ThemeToggle";

/**
 * 현재 경로에 해당하는 카테고리를 활성 표시하려면 pathname 이 필요하고,
 * pathname 은 클라이언트에서만 알 수 있어 이 컴포넌트만 "use client" 다.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <Container>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3 md:h-16 md:py-0">
          <Link
            href="/"
            className="mr-auto text-base font-semibold tracking-tight text-heading underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
          >
            {SITE_NAME}
          </Link>

          <nav aria-label="카테고리" className="flex items-center gap-x-5">
            {CATEGORIES.map((category) => {
              const href = categoryHref(category);
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={category.slug}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                    // 색을 뺀 자리를 굵기가 대신한다 — 현재 위치가 색만으로 전달되면 안 된다.
                    isActive
                      ? "font-medium text-heading"
                      : "text-muted hover:text-heading"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/search"
            aria-label="검색"
            aria-current={pathname === "/search" ? "page" : undefined}
            className={`transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
              pathname === "/search"
                ? "text-heading"
                : "text-muted hover:text-heading"
            }`}
          >
            <SearchIcon />
          </Link>

          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
