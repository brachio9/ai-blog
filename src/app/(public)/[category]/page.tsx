import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { PostList, type PostListItem } from "@/components/post/PostList";
import { CATEGORIES, categoryHref, getCategory } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import type { Post } from "@/types/content";

/** 카테고리 3종을 빌드 타임에 정적 생성한다. */
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[category]">,
): Promise<Metadata> {
  const { category } = await props.params;
  const found = getCategory(category);
  if (!found) {
    return {};
  }

  // 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
  return { title: found.name, description: found.description };
}

/** 본문(body)은 목록에 쓰이지 않는다. 직렬화하면 HTML 만 커진다. */
function toListItem(post: Post): PostListItem {
  return {
    slug: post.slug,
    category: post.category,
    title: post.frontmatter.title,
    summary: post.frontmatter.summary,
    publishedAt: post.frontmatter.publishedAt,
    tags: post.frontmatter.tags,
    readingMinutes: post.readingMinutes,
    paper: post.frontmatter.paper,
  };
}

/**
 * 최상위 동적 세그먼트라 알 수 없는 경로를 전부 삼킨다 — 반드시 notFound() 로 걸러낸다.
 * 쿼리 파라미터(tag·page)는 여기서 읽지 않는다. 서버에서 읽는 순간 페이지가 통째로 동적이 되어
 * 정적 생성이 사라진다 (실측). 필터·페이지네이션은 PostList 가 클라이언트에서 처리하고,
 * 목록 자체는 PostList 안의 PostTable(밀집 표)이 그린다.
 */
export default async function CategoryPage(props: PageProps<"/[category]">) {
  const { category } = await props.params;
  const found = getCategory(category);
  if (!found) {
    notFound();
  }

  const items = getPostsByCategory(found.slug).map(toListItem);
  // 식별자 열은 arXiv ID 가 있는 목록에서만 쓴다 — 카테고리 slug 를 여기 박지 않는다.
  const showIdentifier = items.some((item) => item.paper !== undefined);

  // 수록 기간. 목록은 최신순이라 양 끝이 곧 처음과 마지막이다.
  const newest = items.at(0);
  const oldest = items.at(-1);

  return (
    <Container>
      <div className="space-y-8 py-12 md:py-16">
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            {found.name}
          </h1>
          <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-muted">
            {found.description}
          </p>

          {/* 이 카테고리에 무엇이 얼마나 쌓였는지 — 문장이 아니라 수치로 알린다. */}
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 font-mono text-xs text-muted tabular-nums">
            <span>{items.length}편</span>
            {oldest && newest ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {formatDateShort(oldest.publishedAt)} ~{" "}
                  {formatDateShort(newest.publishedAt)}
                </span>
              </>
            ) : null}
          </p>
        </header>

        {/* 쿼리 파라미터를 읽는 클라이언트 목록은 Suspense 없이는 정적 생성이 실패한다. */}
        <Suspense fallback={null}>
          <PostList
            items={items}
            basePath={categoryHref(found)}
            showIdentifier={showIdentifier}
            reserveViews
          />
        </Suspense>
      </div>
    </Container>
  );
}
