import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { getAllPosts } from "@/lib/content/posts";
import { listHref } from "@/lib/pagination";
import { tagIndex } from "@/lib/stats";

/** 고른 태그는 이 경로의 `?tag=` 에 실린다 — 카테고리·검색 목록과 같은 규약이다. */
const TAGS_PATH = "/tags";

// 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
export const metadata: Metadata = {
  title: "태그 색인",
  description: "글에 붙은 태그를 많이 쓰인 순서로 모았습니다.",
  alternates: { canonical: TAGS_PATH },
};

/**
 * 태그 **색인**. 목록은 여기서 그리지 않는다 — 고른 태그는 `/search?tag=` 로 넘긴다.
 *
 * 옛 판은 이 페이지 아래에 글 목록을 직접 붙였는데 **페이지네이션이 없었다.**
 * 태그 하나에 수백 편이 걸리면 그 목록은 못 쓴다. 검색 화면은 페이지네이션도 있고
 * 주제·출처를 함께 걸 수도 있으니 되찾기는 그쪽이 맡는 것이 맞다.
 * 그 결과 컴포넌트가 하나 늘지 않고 오히려 하나(`TagPosts`) 줄었다.
 *
 * 태그 크기를 빈도에 따라 키우는 태그 클라우드는 만들지 않는다 (docs/UI_GUIDE.md):
 * 크기 차이는 읽기 어렵고 접근성이 나쁘다. 숫자로 보인다.
 */
export default function TagsPage() {
  const tags = tagIndex();
  const posts = getAllPosts();

  return (
    <Container>
      <div className="py-12 md:py-16">
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            태그 색인
          </h1>
          <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-muted">
            많이 쓰인 태그가 위에 옵니다. 하나를 고르면 그 태그가 붙은 글이
            검색 화면에 모입니다 — 거기서 주제·출처를 함께 걸 수 있습니다.
          </p>
          {/* 태그의 역할은 좁다 — 무엇에 대한 글인지는 주제 축이 맡는다. */}
          <p className="mt-3 max-w-[68ch] text-[length:var(--text-small)] leading-[var(--leading-tight)] text-muted">
            태그는 모델·툴·기법 같은 고유명사에만 답니다. 무엇에 대한 글인지는{" "}
            <Link
              href="/topics"
              className="text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
            >
              주제
            </Link>{" "}
            여섯 갈래가 맡습니다.
          </p>
          <p className="mt-3 font-mono text-xs text-muted tabular-nums">
            태그 {tags.length}개 · 글 {posts.length}편
          </p>
        </header>

        {tags.length > 0 ? (
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map(({ tag, count }) => (
              <li key={tag} className="border-b border-border">
                <Link
                  href={listHref("/search", { tag })}
                  className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span className="min-w-0 truncate text-[0.9375rem] text-heading">
                    {tag}
                  </span>
                  {/* 빈도는 크기가 아니라 숫자로 알린다. */}
                  <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                    {count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-muted">아직 붙은 태그가 없습니다.</p>
        )}

      </div>
    </Container>
  );
}
