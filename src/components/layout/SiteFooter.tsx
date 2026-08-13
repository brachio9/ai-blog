import Link from "next/link";

import { SITE_NAME } from "@/lib/site";

import { Container } from "./Container";

/** 저작권 연도는 KST 기준으로 표기한다 (빌드 머신의 타임존에 좌우되지 않도록). */
function currentYearKst(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

/**
 * 헤더가 놓친 길을 여기서 낸다 — 카테고리는 헤더가 이미 갖고 있으므로 다시 늘어놓지 않는다.
 * 이름만으로는 무엇인지 모를 곳이라 한 줄 설명을 붙인다 (헤더의 맨 링크 나열과 다른 형태다).
 */
const DESTINATIONS = [
  { href: "/tags", label: "태그 색인", hint: "주제로 훑기" },
  { href: "/archive", label: "아카이브", hint: "연·월별 발행 이력" },
  { href: "/about", label: "소개", hint: "무엇을 어떻게 추리는지" },
];

const LINK =
  "text-[0.9375rem] text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <Container>
        <div className="flex flex-col gap-8 py-10 md:flex-row md:justify-between md:gap-16">
          <div className="max-w-[46ch]">
            <p className="text-sm font-semibold text-heading">{SITE_NAME}</p>
            <p className="mt-2 text-sm leading-[1.7] text-muted">
              요약·인용한 글에는 원문 출처를 반드시 함께 적습니다.
            </p>
          </div>

          <nav aria-label="둘러보기" className="md:min-w-[18rem]">
            <ul>
              {DESTINATIONS.map(({ href, label, hint }) => (
                <li
                  key={href}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-2"
                >
                  <Link href={href} className={LINK}>
                    {label}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">{hint}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-4 border-b border-border py-2">
                {/* 라우트가 아니라 파일이라 Link 를 쓰지 않는다. */}
                <a href="/rss.xml" className={LINK}>
                  RSS
                </a>
                <span className="shrink-0 text-xs text-muted">구독</span>
              </li>
            </ul>
          </nav>
        </div>

        <p className="border-t border-border py-4 text-xs text-muted tabular-nums">
          © {currentYearKst()} {SITE_NAME}
        </p>
      </Container>
    </footer>
  );
}
