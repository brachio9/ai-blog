import { SITE_NAME } from "@/lib/site";

import { Container } from "./Container";

/** 저작권 연도는 KST 기준으로 표기한다 (빌드 머신의 타임존에 좌우되지 않도록). */
function currentYearKst(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <Container>
        <div className="flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYearKst()} {SITE_NAME}</p>
          <p>요약·인용한 글에는 원문 출처를 반드시 함께 적습니다.</p>
          {/* rss.xml 은 다음 phase 에서 생성된다. */}
          <a
            href="/rss.xml"
            className="text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            RSS
          </a>
        </div>
      </Container>
    </footer>
  );
}
