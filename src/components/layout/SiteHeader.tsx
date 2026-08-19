"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchIcon } from "@/components/ui/icons";
import { SITE_NAME } from "@/lib/site";

import { Container } from "./Container";
import { ThemeToggle } from "./ThemeToggle";

/**
 * 들어가는 문 셋. **분류를 늘어놓지 않는다** (2026-08-19 개편).
 *
 * 옛 머리는 `주제 │ 논문 릴리즈 소식 커뮤니티 기록 │ 색인 아카이브` 여덟 칸이었고,
 * 이 파일의 옛 주석이 그 실패를 이미 적어 뒀다 — 「카테고리 라벨 다섯은 157px 라
 * 320~400px 대에서는 간격을 아무리 좁혀도 폭이 안 나온다(실측)」. 그래서 가로로 밀렸다.
 *
 * 그런데 문제는 **카테고리냐 축이냐가 아니라 분류를 나열한다는 것**이었다. 실측(글 60편):
 *
 *     카테고리   논문 37 · 릴리즈 12 · 소식 6 · 커뮤니티 4 · 기록 1   → 5칸 중 2칸이 합쳐 5편
 *     6축        서빙 21 · 에이전트 19 · 코딩 9 · 검색 4 · 음성 4 · 도메인 3
 *
 * 어느 쪽을 늘어놓아도 절반이 거의 빈 곳을 가리키고, 머리에는 편수를 적을 자리가 없어
 * 「커뮤니티」라는 낱말만으로는 4편인지 400편인지 알 수 없다.
 *
 * 그래서 문 셋만 남기고 **편수는 그 안에서** 보여 준다 — `/topics` 와 `/sources` 는
 * 막대와 숫자로 분포를 그리고, 홈의 일자 구획머리는 그날의 축 집계를 링크로 단다.
 * 지금 보고 있는 날에 실제로 몇 편인지가 같이 나오는 것은 고정 목록이 못 하는 일이다.
 *
 * `/tags` 를 뺀 것은 `/search` 가 주제×출처×태그를 함께 거는 면이 되면서 입구가 겹쳐서다.
 */
const NAV = [
  { href: "/topics", label: "주제" },
  { href: "/sources", label: "출처" },
  { href: "/archive", label: "아카이브" },
];

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
            대신 카테고리는 짧은 이름으로, 색인은 접어서 한 줄 안에 들어오게 한다.
            좁은 폭에서는 간격도 한 눈금 좁힌다 — 5칸이 되면서 항목 사이가 두 번 더 들어간다. */}
        <div className="flex items-baseline gap-[var(--space-2)] pt-[var(--space-5)] pb-[var(--space-4)] sm:gap-[var(--space-4)]">
          <Link
            href="/"
            className="shrink-0 text-[length:var(--text-h4)] font-bold tracking-[-0.02em] text-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            {SITE_NAME}
          </Link>

          {/* 문 셋. 여덟 칸이던 시절에는 좁은 화면에서 띠가 가로로 밀렸는데,
              한글 21자가 8자로 줄면서 320px 에서도 밀리지 않는다. */}
          <nav
            aria-label="둘러보기"
            className="flex min-w-0 items-baseline gap-[var(--space-3)] sm:gap-[var(--space-4)]"
          >
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(href) ? "page" : undefined}
                className={`${NAV_LINK} shrink-0 ${isCurrent(href) ? CURRENT : RESTING}`}
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
