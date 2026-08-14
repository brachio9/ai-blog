"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchIcon } from "@/components/ui/icons";
import { CATEGORIES, categoryHref } from "@/lib/categories";
import { SITE_NAME } from "@/lib/site";

import { Container } from "./Container";
import { ThemeToggle } from "./ThemeToggle";

/**
 * 되찾기용 색인 — 카테고리(무엇을 싣는가)와 성격이 달라 내비를 둘로 나눈다.
 * 좁은 화면에서는 접고 푸터가 받는다. 헤더 한 줄을 지키는 쪽이 낫다.
 */
const INDEXES = [
  { href: "/tags", label: "색인" },
  { href: "/archive", label: "아카이브" },
];

/** 주제 색인. 카테고리와 나란히 서지만 답하는 질문이 달라 내비를 따로 세운다. */
const TOPICS = "/topics";

/**
 * 현재 위치는 밑줄이 아니라 안료로 가리킨다 — 링크의 밑줄과 겹치면 구분이 안 된다.
 * 낮 바탕에서 --color-accent(600)는 작은 글자 대비가 4.5:1 에 못 미치므로
 * 한 단계 깊은 700 을, 밤 바탕에서는 300 을 쓴다 (docs/UI_GUIDE.md 접근성).
 * 색만으로 전달하지 않도록 aria-current 와 굵기를 함께 얹는다.
 */
const CURRENT =
  "font-medium text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]";
const RESTING = "text-muted hover:text-heading";
const NAV_LINK =
  "voice-ui transition-colors focus-visible:outline-2 focus-visible:outline-focus";

/**
 * 현재 경로에 해당하는 카테고리를 활성 표시하려면 pathname 이 필요하고,
 * pathname 은 클라이언트에서만 알 수 있어 이 컴포넌트만 "use client" 다.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header>
      <Container>
        {/* flex-wrap 을 켜지 않는다 — 좁은 화면에서 토글이 다음 줄로 떨어져 머리가 두 줄이 된다.
            대신 카테고리는 짧은 이름으로, 색인은 접어서 한 줄 안에 들어오게 한다. */}
        <div className="flex items-baseline gap-[var(--space-4)] pt-[var(--space-5)] pb-[var(--space-4)]">
          <Link
            href="/"
            className="text-[length:var(--text-h4)] font-bold tracking-[-0.02em] text-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            {SITE_NAME}
          </Link>

          {/* 주제는 카테고리보다 앞이다 — 무엇을 다루는가(매체의 약속)가 원문이 어디서 왔는가보다 앞선다.
              가는 세로 괘선 하나로 갈래 묶음과 가른다: 같은 간격으로 늘어놓으면
              「주제」가 네 번째 카테고리처럼 읽힌다. */}
          <nav
            aria-label="주제"
            className="border-r border-border pr-[var(--space-3)]"
          >
            <Link
              href={TOPICS}
              aria-current={isCurrent(TOPICS) ? "page" : undefined}
              className={`${NAV_LINK} ${isCurrent(TOPICS) ? CURRENT : RESTING}`}
            >
              주제
            </Link>
          </nav>

          <nav
            aria-label="카테고리"
            className="flex items-baseline gap-[var(--space-4)]"
          >
            {CATEGORIES.map((category) => {
              const href = categoryHref(category);
              const active = isCurrent(href);

              return (
                <Link
                  key={category.slug}
                  href={href}
                  // 화면 폭에 따라 표기가 바뀌어도 읽히는 이름은 하나여야 한다.
                  aria-label={category.name}
                  aria-current={active ? "page" : undefined}
                  className={`${NAV_LINK} ${active ? CURRENT : RESTING}`}
                >
                  <span className="sm:hidden">{category.shortName}</span>
                  <span className="hidden sm:inline">{category.name}</span>
                </Link>
              );
            })}
          </nav>

          <nav
            aria-label="찾아보기"
            className="hidden items-baseline gap-[var(--space-4)] sm:flex"
          >
            {INDEXES.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(href) ? "page" : undefined}
                className={`${NAV_LINK} ${isCurrent(href) ? CURRENT : RESTING}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 아이콘과 버튼은 글자 베이스라인에 걸리지 않는다 — 이 묶음만 가운데로 맞춘다. */}
          <div className="ml-auto flex shrink-0 items-center gap-[var(--space-2)] self-center">
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
        </div>

        {/* 굵은선/얇은선 쌍 — 지면의 머리 장식. 이 화면에서 한 번, 푸터에서 한 번이 상한이다. */}
        <div className="rule-pair" />
      </Container>
    </header>
  );
}
