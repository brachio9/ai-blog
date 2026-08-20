import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { PostList, type PostListItem } from "@/components/post/PostList";
import {
  ACCENT_TEXT,
  CATEGORIES,
  categoryHref,
  getCategory,
  type Category,
} from "@/lib/categories";
import { getPostsByCategory } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { countByCategory } from "@/lib/stats";
import type { Post } from "@/types/content";

/** 카테고리 5종을 빌드 타임에 정적 생성한다. */
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(
  props: PageProps<"/sources/[category]">,
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
    axis: post.frontmatter.axis,
    title: post.frontmatter.title,
    summary: post.frontmatter.summary,
    publishedAt: post.frontmatter.publishedAt,
    tags: post.frontmatter.tags,
    readingMinutes: post.readingMinutes,
    format: post.frontmatter.format,
    paper: post.frontmatter.paper,
  };
}

/**
 * 최상위 동적 세그먼트라 알 수 없는 경로를 전부 삼킨다 — 반드시 notFound() 로 걸러낸다.
 * 쿼리 파라미터(tag·page)는 여기서 읽지 않는다. 서버에서 읽는 순간 페이지가 통째로 동적이 되어
 * 정적 생성이 사라진다 (실측). 필터·페이지네이션은 PostList 가 클라이언트에서 처리하고,
 * 목록 자체는 PostList 안의 PostTable(밀집 표)이 그린다.
 */
export default async function CategoryPage(props: PageProps<"/sources/[category]">) {
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
      {/* 위쪽 여백은 .masthead 가 이미 갖고 있다 — 여기서 또 주면 제호가 지면 한가운데로 내려간다. */}
      <div className="space-y-8 pb-12 md:pb-16">
        {/* 제호 — 홈과 달리 사이트 이름은 작아지고 카테고리 이름이 커진다.
            디자인 정본(design/components/masthead.html)은 34px 를 쓰지만 척도에 없는 값이라
            한 눈금 위의 --text-h1(40px)로 받는다. 46px 인 홈 제호보다는 여전히 작다.
            globals.css 의 .masthead-title 은 레이어 밖이라 Tailwind 유틸리티로는 못 덮는다 —
            디자인 정본이 이 자리에 인라인 style 을 쓰는 이유가 그것이다. */}
        {/* 빈 칸에서는 제호를 선으로 닫지 않는다 — .empty 가 자기 윗선을 갖고 있어
            그대로 두면 같은 선이 두 줄 생긴다 (/topics/[axis] 와 같은 처리). */}
        <header
          className={`masthead ${items.length > 0 ? "border-b border-border" : ""}`}
        >
          <p className={`voice-ui ${ACCENT_TEXT[found.accent]}`}>
            {SITE_NAME} · {found.name}
          </p>
          <h1
            className="masthead-title mt-[var(--space-1)] text-heading"
            style={{ fontSize: "var(--text-h1)" }}
          >
            {found.name}
          </h1>
          <p className="masthead-line">{found.description}</p>

          {/* 이 카테고리에 무엇이 얼마나 쌓였는지 — 문장이 아니라 수치로 알린다. */}
          <div className="masthead-meta">
            <span className="voice-ui text-muted">
              <span className="voice-source">{items.length}</span>편
            </span>
            {oldest && newest ? (
              <span className="voice-source">
                {formatDateShort(oldest.publishedAt)} –{" "}
                {formatDateShort(newest.publishedAt)}
              </span>
            ) : null}
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyCategory category={found} />
        ) : (
          /* 이 화면은 긴장 축의 여유 쪽에 선다 — 카테고리에 처음 들어온 사람이 훑는 자리라
             항목마다 요약 한 줄을 붙이고 `.list-loose` 로 간격을 넓게 연다.
             되찾기 전용인 아카이브·태그 색인이 반대쪽 끝(가장 좁은 밀도)이다.
             쿼리 파라미터를 읽는 클라이언트 목록은 Suspense 없이는 정적 생성이 실패한다. */
          <div className="list-loose">
            <Suspense fallback={null}>
              <PostList
                items={items}
                basePath={categoryHref(found)}
                showIdentifier={showIdentifier}
                showSummary
                reserveViews
              />
            </Suspense>
          </div>
        )}
      </div>
    </Container>
  );
}

/**
 * 빈 칸. 5칸 개편으로 릴리즈·커뮤니티가 당분간 비었고, 감추지 않는 것이 정보라 자리를 남겼다 —
 * 그렇다면 막다른 길로 두지 않는 것까지가 짝이다. 사과하지 않고 **다음에 갈 곳**을 준다.
 * PostList 의 한 줄짜리 빈 문장은 필터로 좁혀 비었을 때의 것이다. 아예 빈 칸은 성격이 다르다.
 */
function EmptyCategory({ category: empty }: { category: Category }) {
  const counts = new Map(
    countByCategory().map(({ slug, count }) => [slug, count]),
  );
  // 글이 있는 칸만 권한다. 빈 칸으로 보내면 같은 막다른 길이 한 번 더 나온다.
  const others = CATEGORIES.filter(
    (category) =>
      category.slug !== empty.slug && (counts.get(category.slug) ?? 0) > 0,
  );

  return (
    <div className="empty">
      <div className="empty-line text-heading">
        이 칸에는 아직 실린 글이 없습니다.
      </div>
      <p className="mt-[var(--space-2)] max-w-[54ch] text-[length:var(--text-small)] leading-[var(--leading-tight)] text-muted">
        자리는 열려 있습니다 — 비어 있다는 것도 이 지면이 지금 무엇을 싣고 있는지
        말해 줍니다.
      </p>

      <div className="empty-next">
        <p className="kicker">지금 글이 있는 칸</p>
        <ul
          role="list"
          aria-label="글이 있는 다른 칸"
          className="mt-[var(--space-2)] flex flex-wrap gap-x-[var(--space-5)] gap-y-[var(--space-1)]"
        >
          {others.map((category) => (
            <li key={category.slug}>
              <Link
                href={categoryHref(category)}
                className="voice-ui text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
              >
                {category.name}{" "}
                <span className="voice-source">
                  {counts.get(category.slug) ?? 0}
                </span>
                편
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
