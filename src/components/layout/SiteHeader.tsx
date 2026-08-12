"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CATEGORIES, categoryHref } from "@/lib/categories";

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
            className="mr-auto text-base font-semibold tracking-tight text-heading transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            AI 동향 블로그
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
                  className={`text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    isActive ? "text-accent" : "text-muted hover:text-heading"
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
            className={`transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              pathname === "/search"
                ? "text-accent"
                : "text-muted hover:text-heading"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" />
            </svg>
          </Link>

          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
