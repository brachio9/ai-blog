import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { PostList, type PostListItem } from "@/components/post/PostList";
import { AXES, axisHref, axisNumber, getAxis, type Axis } from "@/lib/axes";
import { getPostsByAxis } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { countByAxis } from "@/lib/stats";
import type { Post } from "@/types/content";

/** 6축을 빌드 타임에 정적 생성한다. 축은 닫힌 집합이라 이 목록이 전부다. */
export function generateStaticParams() {
  return AXES.map((axis) => ({ axis: axis.slug }));
}

export async function generateMetadata(
  props: PageProps<"/topics/[axis]">,
): Promise<Metadata> {
  const { axis } = await props.params;
  const found = getAxis(axis);
  if (!found) {
    return {};
  }

  // 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
  return {
    title: found.name,
    description: found.description,
    alternates: { canonical: axisHref(found) },
  };
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
 * 축별 목록. 카테고리 목록과 같은 골격이되 두 곳이 다르다:
 *
 * 1. 제호 위 라벨에 안료를 쓰지 않는다 — 축의 부호는 색이 아니라 번호다 (docs/UI_GUIDE.md).
 * 2. 목록에 갈래 라벨을 켠다 — 축은 카테고리를 가로지르므로 한 목록에 세 갈래가 섞인다.
 *
 * 쿼리 파라미터(tag·format·page)는 여기서 읽지 않는다. 서버에서 읽는 순간 페이지가
 * 통째로 동적이 되어 정적 생성이 사라진다 (실측) — PostList 가 클라이언트에서 처리한다.
 */
export default async function AxisPage(props: PageProps<"/topics/[axis]">) {
  const { axis } = await props.params;
  const found = getAxis(axis);
  if (!found) {
    notFound();
  }

  const items = getPostsByAxis(found.slug).map(toListItem);
  // 식별자 열은 arXiv ID 가 있는 목록에서만 쓴다.
  const showIdentifier = items.some((item) => item.paper !== undefined);

  // 수록 기간. 목록은 최신순이라 양 끝이 곧 처음과 마지막이다.
  const newest = items.at(0);
  const oldest = items.at(-1);

  return (
    <Container>
      {/* 위쪽 여백은 .masthead 가 이미 갖고 있다. */}
      <div className="space-y-8 pb-12 md:pb-16">
        {/* 빈 축에서는 제호를 선으로 닫지 않는다 — .empty 가 자기 윗선을 갖고 있어
            그대로 두면 32px 사이에 같은 선이 두 줄 생긴다. */}
        <header
          className={`masthead ${items.length > 0 ? "border-b border-border" : ""}`}
        >
          {/* 카테고리 페이지는 여기서 안료를 쓴다. 축은 무채다 — 번호가 그 자리를 대신한다. */}
          <p className="voice-ui text-muted">
            {SITE_NAME} · 주제{" "}
            <span className="voice-source">{axisNumber(found)}</span>
          </p>
          <h1
            className="masthead-title mt-[var(--space-1)] text-heading"
            style={{ fontSize: "var(--text-h1)" }}
          >
            {found.name}
          </h1>
          <p className="masthead-line">{found.description}</p>

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
          <EmptyAxis axis={found} />
        ) : (
          /* 카테고리 목록과 같은 여유 밀도로 연다.
             쿼리 파라미터를 읽는 클라이언트 목록은 Suspense 없이는 정적 생성이 실패한다. */
          <div className="list-loose">
            <Suspense fallback={null}>
              <PostList
                items={items}
                basePath={axisHref(found)}
                showCategory
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
 * 빈 축. 사과하지 않는다 — 이 축이 무엇을 받을 자리인지 적고 **다음에 갈 곳**을 준다.
 * 검색으로 들어왔다가 빈손으로 나가면 실패다 (design/components/controls.html).
 */
function EmptyAxis({ axis: empty }: { axis: Axis }) {
  const counts = new Map(countByAxis().map(({ slug, count }) => [slug, count]));
  // 글이 있는 다른 축만 권한다. 빈 축으로 보내면 같은 막다른 길이 한 번 더 나온다.
  const others = AXES.filter(
    (axis) => axis.slug !== empty.slug && (counts.get(axis.slug) ?? 0) > 0,
  );

  return (
    <div className="empty">
      <div className="empty-line text-heading">
        이 축에는 아직 실린 글이 없습니다.
      </div>
      <p className="mt-[var(--space-2)] max-w-[54ch] text-[length:var(--text-small)] leading-[var(--leading-tight)] text-muted">
        받을 자리는 열려 있습니다 — {empty.covers.slice(0, 4).join(" · ")} 같은
        것을 이 축에 싣습니다.
      </p>

      <div className="empty-next">
        <p className="kicker">지금 글이 있는 축</p>
        <ul
          role="list"
          aria-label="글이 있는 다른 축"
          className="mt-[var(--space-2)] flex flex-wrap gap-x-[var(--space-5)] gap-y-[var(--space-1)]"
        >
          {others.map((axis) => (
            <li key={axis.slug}>
              <Link
                href={axisHref(axis)}
                className="voice-ui text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="voice-source">{axisNumber(axis)}</span>{" "}
                {axis.name}{" "}
                <span className="voice-source">{counts.get(axis.slug)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="voice-ui mt-[var(--space-4)] text-muted">
          모델·툴 이름으로 찾는다면{" "}
          <Link
            href="/tags"
            className="text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            태그 색인
          </Link>
          이 빠릅니다.
        </p>
      </div>
    </div>
  );
}
