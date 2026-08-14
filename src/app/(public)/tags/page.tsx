import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import type { PostListItem } from "@/components/post/PostList";
import { TagPosts } from "@/components/post/TagPosts";
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
 * 태그 색인. 태그 목록은 서버가 그리고(색인이 이 페이지의 본체다),
 * 고른 태그의 글만 <Suspense> 안의 클라이언트 컴포넌트가 URL 을 읽어 채운다 —
 * 서버에서 searchParams 를 읽으면 페이지가 통째로 동적이 되어 정적 생성이 사라진다.
 *
 * 태그 크기를 빈도에 따라 키우는 태그 클라우드는 만들지 않는다 (docs/UI_GUIDE.md):
 * 크기 차이는 읽기 어렵고 접근성이 나쁘다. 숫자로 보인다.
 */
export default function TagsPage() {
  const tags = tagIndex();
  const posts = getAllPosts();

  // 본문(body)은 목록에 쓰이지 않는다 — 클라이언트로 넘기면 HTML 만 커진다.
  const items: PostListItem[] = posts.map((post) => ({
    slug: post.slug,
    category: post.category,
    title: post.frontmatter.title,
    summary: post.frontmatter.summary,
    publishedAt: post.frontmatter.publishedAt,
    tags: post.frontmatter.tags,
    readingMinutes: post.readingMinutes,
    paper: post.frontmatter.paper,
  }));

  return (
    <Container>
      <div className="py-12 md:py-16">
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            태그 색인
          </h1>
          <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-muted">
            많이 쓰인 태그가 위에 옵니다. 하나를 고르면 카테고리를 가로질러 그
            태그가 붙은 글이 아래에 모입니다.
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
                  href={listHref(TAGS_PATH, { tag })}
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

        {/* 태그로 골라 본 글도 되찾기다 — 아카이브와 같은 밀도로 좁게 싣는다. */}
        <section className="list-tight mt-12 border-t border-border pt-6">
          <Suspense fallback={null}>
            <TagPosts items={items} basePath={TAGS_PATH} />
          </Suspense>
        </section>
      </div>
    </Container>
  );
}
