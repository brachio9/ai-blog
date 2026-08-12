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
          <p>© {currentYearKst()} AI 동향 블로그</p>
          <p>외부 글을 요약·인용할 때는 원문 출처를 반드시 함께 표기합니다.</p>
          {/* rss.xml 은 다음 phase 에서 생성된다. */}
          <a
            href="/rss.xml"
            className="text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
          >
            RSS
          </a>
        </div>
      </Container>
    </footer>
  );
}
