"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { CategorySlug } from "@/lib/categories";
import { collectTags, filterByTag, listHref, paginate } from "@/lib/pagination";
import type { PaperMeta, Post } from "@/types/content";

import { PostIndexRow } from "./PostIndexRow";
import { PostTable } from "./PostTable";
import { TagFilter } from "./TagFilter";
import { ViewCounts } from "./ViewCounts";

export interface PostListItem {
  slug: string;
  category: CategorySlug;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  readingMinutes: number;
  /** 논문이면 식별자 열에 arXiv ID 가 나온다 */
  paper?: PaperMeta;
}

export interface PostListProps {
  items: PostListItem[];
  /**
   * 태그·페이지 링크의 기준 경로 (예: "/papers").
   * 검색 페이지처럼 유지해야 할 쿼리가 있으면 `"/search?q=추론"` 처럼 붙여서 넘긴다.
   */
  basePath: string;
  showCategory?: boolean;
  showIdentifier?: boolean;
  showSummary?: boolean;
  reserveViews?: boolean;
  /**
   * 항목의 성격. `"index"` 는 되찾기용 3열 색인이고 기본은 레일이 붙은 항목이다.
   * 밀도(`.list-tight` / `.list-loose`)는 여기가 아니라 감싸는 화면이 정한다.
   */
  variant?: "entry" | "index";
}

/**
 * PostTable 의 계약은 Post 다. 목록은 본문(body)을 클라이언트로 넘기지 않으므로
 * 표가 읽는 필드만 채워 되돌린다 — 표를 새로 만들지 않기 위한 어댑터다.
 */
export function toPost(item: PostListItem): Post {
  return {
    frontmatter: {
      title: item.title,
      category: item.category,
      summary: item.summary,
      publishedAt: item.publishedAt,
      tags: item.tags,
      paper: item.paper,
      draft: false,
      lead: false,
    },
    slug: item.slug,
    category: item.category,
    body: "",
    // 원본 경로는 에러 메시지용이라 목록에는 넘어오지 않는다. PostTable 도 읽지 않는다.
    filePath: "",
    readingMinutes: item.readingMinutes,
  };
}

/** 조회수 저장소의 post_id — 글 상세 URL 과 같다 (services/turso.ts). */
function viewId(item: PostListItem): string {
  return `${item.category}/${item.slug}`;
}

/**
 * 필터·페이지네이션을 클라이언트에서 처리한다.
 * 서버에서 searchParams 를 읽으면 페이지가 통째로 동적이 되어 정적 생성이 사라진다 (실측).
 * 이 컴포넌트를 쓰는 쪽은 반드시 <Suspense> 로 감싼다.
 */
export function PostList({
  items,
  basePath,
  showCategory,
  showIdentifier,
  showSummary,
  reserveViews,
  variant = "entry",
}: PostListProps) {
  const searchParams = useSearchParams();

  // get() 은 인코딩된 한글 태그를 자동으로 디코딩해 준다.
  const activeTag = searchParams.get("tag") ?? undefined;
  const rawPage = searchParams.get("page");
  const page = rawPage === null ? 1 : Number(rawPage);

  // 태그 목록은 넘겨받은 items 에서 집계한다 — 전역 태그를 쓰면 여기 없는 태그가 나온다.
  const tags = collectTags(items);
  const filtered = filterByTag(items, activeTag);
  const { items: visible, totalPages, isOutOfRange } = paginate(filtered, page);

  return (
    <div className="space-y-6">
      <TagFilter tags={tags} activeTag={activeTag} basePath={basePath} />

      {isOutOfRange ? (
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="text-sm text-body">
            해당 페이지에 글이 없습니다. 전체 {totalPages}페이지입니다.
          </p>
          <Link
            href={listHref(basePath, { tag: activeTag, page: 1 })}
            className="mt-2 inline-block text-sm text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            1페이지로 이동
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted">
          {activeTag
            ? `'${activeTag}' 태그의 글이 없습니다.`
            : "아직 올라온 글이 없습니다."}
        </p>
      ) : (
        /* 조회수는 지금 보이는 페이지의 글만, 한 번에 물어본다.
           reserveViews 가 꺼져 있으면 채울 칸이 없으므로 호출도 하지 않는다. */
        <ViewCounts ids={reserveViews ? visible.map(viewId) : []}>
          {variant === "index" ? (
            <ul role="list" aria-label="글 목록">
              {visible.map((item) => (
                <PostIndexRow key={viewId(item)} post={toPost(item)} />
              ))}
            </ul>
          ) : (
            <PostTable
              posts={visible.map(toPost)}
              showCategory={showCategory}
              showIdentifier={showIdentifier}
              showSummary={showSummary}
              reserveViews={reserveViews}
            />
          )}
        </ViewCounts>
      )}

      {!isOutOfRange && totalPages > 1 ? (
        <nav
          aria-label="페이지네이션"
          className="flex items-center justify-between gap-4 border-t border-border pt-4 text-sm"
        >
          {page > 1 ? (
            <Link
              href={listHref(basePath, { tag: activeTag, page: page - 1 })}
              rel="prev"
              className="rounded border border-border px-4 py-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              이전
            </Link>
          ) : (
            <span className="px-4 py-2 text-faint">이전</span>
          )}

          <span aria-current="page" className="text-muted">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={listHref(basePath, { tag: activeTag, page: page + 1 })}
              rel="next"
              className="rounded border border-border px-4 py-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              다음
            </Link>
          ) : (
            <span className="px-4 py-2 text-faint">다음</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
