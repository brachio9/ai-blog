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
 * 푸터는 링크 창고가 아니라 되찾기 장치다 — 기록용 독자가 가장 자주 쓰는 곳이다.
 * 카테고리는 헤더가 이미 갖고 있으므로 다시 늘어놓지 않는다.
 */
const DESTINATIONS = [
  { href: "/tags", label: "태그 색인" },
  { href: "/archive", label: "아카이브" },
  { href: "/about", label: "소개" },
];

const LINK =
  "voice-ui text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus";

export function SiteFooter() {
  return (
    <footer className="mt-[var(--space-8)]">
      <Container>
        {/* 지면을 닫는 괘선 쌍. 머리에서 한 번, 여기서 한 번 — 그 이상은 쓰지 않는다. */}
        <div className="rule-pair" />

        <div className="grid gap-[var(--space-5)] pb-[var(--space-7)] md:grid-cols-[1fr_auto] md:gap-[var(--space-6)]">
          <div>
            <p className="text-[length:var(--text-h4)] font-semibold text-heading">
              {SITE_NAME}
            </p>
            <p className="mt-[var(--space-1)] max-w-[52ch] text-[length:var(--text-small)] text-muted">
              요약·인용한 글에는 원문 출처를 반드시 함께 적습니다.
            </p>
            {/* 두 목소리 — 연도는 mono, 이름은 한글 서체. mono 자리에 한글을 섞지 않는다. */}
            <p className="mt-[var(--space-3)] flex items-baseline gap-[var(--space-2)]">
              <span className="voice-source">© {currentYearKst()}</span>
              <span className="voice-ui text-muted">{SITE_NAME}</span>
            </p>
          </div>

          <nav
            aria-label="둘러보기"
            className="grid justify-items-start gap-[var(--space-1)] md:justify-items-end"
          >
            {DESTINATIONS.map(({ href, label }) => (
              <Link key={href} href={href} className={LINK}>
                {label}
              </Link>
            ))}
            {/* 라우트가 아니라 파일이라 Link 를 쓰지 않는다. */}
            <a href="/rss.xml" className={LINK}>
              RSS
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
