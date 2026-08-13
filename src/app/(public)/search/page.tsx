import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { SearchClient } from "@/components/search/SearchClient";

// 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
export const metadata: Metadata = {
  title: "검색",
  description: "글 제목·요약·태그에서 찾습니다.",
  alternates: { canonical: "/search" },
};

/**
 * 검색은 클라이언트에서만 돈다 (ADR-007).
 * 여기서 searchParams 를 읽으면 페이지가 통째로 동적이 되어 정적 생성이 사라진다 —
 * 검색어(`?q=`)는 <Suspense> 안의 SearchClient 가 useSearchParams 로 읽는다.
 */
export default function SearchPage() {
  return (
    <Container>
      <div className="space-y-8 py-12 md:py-16">
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            검색
          </h1>
          <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-muted">
            글 제목·요약·태그에서 찾습니다. 본문은 검색 대상이 아닙니다.
          </p>
        </header>

        <Suspense fallback={null}>
          <SearchClient />
        </Suspense>
      </div>
    </Container>
  );
}
