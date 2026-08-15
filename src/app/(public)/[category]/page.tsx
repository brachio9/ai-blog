import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { PostList, type PostListItem } from "@/components/post/PostList";
import {
  CATEGORIES,
  categoryHref,
  getCategory,
  type CategoryAccent,
} from "@/lib/categories";
import { getPostsByCategory } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import type { Post } from "@/types/content";

/**
 * 제호 위의 카테고리 라벨은 13.5px 라 안료의 기본 단계(낮 600)로는 본문 대비 4.5:1 에 닿지 않는다.
 * 낮에는 한 단계 깊은 700, 밤에는 300 을 쓴다 (docs/UI_GUIDE.md 접근성).
 * 목록 안의 안료(components/post 의 ACCENT_TEXT)는 아직 600 이다 — 목록을 다루는 step 이 함께 정한다.
 */
const KICKER_ACCENT: Record<CategoryAccent, string> = {
  paper: "text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]",
  release:
    "text-[var(--color-accent-2-700)] dark:text-[var(--color-accent-2-300)]",
  news: "text-[var(--color-accent-3-700)] dark:text-[var(--color-accent-3-300)]",
  // 먹 2칸: 안료와 달리 --color-neutral-* 는 낮밤이 같은 척도라 밤 값을 여기서 직접 뒤집는다.
  // community 는 낮에 한 단계 깊은 700(8.40:1), note 는 기본 800 으로 이미 12.44:1 이라 그대로 둔다.
  // 900 은 본문 색이라 제호 위 라벨이 본문과 구분되지 않는다.
  community:
    "text-[var(--color-neutral-700)] dark:text-[var(--color-neutral-400)]",
  note: "text-[var(--color-neutral-800)] dark:text-[var(--color-neutral-200)]",
};

/** 카테고리 5종을 빌드 타임에 정적 생성한다. */
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
      {/* 위쪽 여백은 .masthead 가 이미 갖고 있다 — 여기서 또 주면 제호가 지면 한가운데로 내려간다. */}
      <div className="space-y-8 pb-12 md:pb-16">
        {/* 제호 — 홈과 달리 사이트 이름은 작아지고 카테고리 이름이 커진다.
            디자인 정본(design/components/masthead.html)은 34px 를 쓰지만 척도에 없는 값이라
            한 눈금 위의 --text-h1(40px)로 받는다. 46px 인 홈 제호보다는 여전히 작다.
            globals.css 의 .masthead-title 은 레이어 밖이라 Tailwind 유틸리티로는 못 덮는다 —
            디자인 정본이 이 자리에 인라인 style 을 쓰는 이유가 그것이다. */}
        <header className="masthead border-b border-border">
          <p className={`voice-ui ${KICKER_ACCENT[found.accent]}`}>
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

        {/* 이 화면은 긴장 축의 여유 쪽에 선다 — 카테고리에 처음 들어온 사람이 훑는 자리라
            항목마다 요약 한 줄을 붙이고 `.list-loose` 로 간격을 넓게 연다.
            되찾기 전용인 아카이브·태그 색인이 반대쪽 끝(가장 좁은 밀도)이다.
            쿼리 파라미터를 읽는 클라이언트 목록은 Suspense 없이는 정적 생성이 실패한다. */}
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
      </div>
    </Container>
  );
}
