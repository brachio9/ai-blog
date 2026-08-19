"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { AxisSlug } from "@/lib/axes";
import type { CategorySlug } from "@/lib/categories";
import { getFormat, type FormatSlug } from "@/lib/formats";
import {
  collectTags,
  filterByFormat,
  filterByTag,
  listHref,
  paginate,
} from "@/lib/pagination";
import type { PaperMeta, Post } from "@/types/content";

import { PostIndexRow } from "./PostIndexRow";
import { PostTable } from "./PostTable";
import { TagFilter } from "./TagFilter";
import { ViewCounts } from "./ViewCounts";

export interface PostListItem {
  slug: string;
  category: CategorySlug;
  /** 주제 축 — 목록 레일의 두 자리 번호가 된다 */
  axis: AxisSlug;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  readingMinutes: number;
  /** `?format=` 필터가 읽는다. 목록에 라벨로 실리지는 않는다 (포맷은 부호가 없다) */
  format?: FormatSlug;
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
      axis: item.axis,
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
  const activeFormat = searchParams.get("format") ?? undefined;
  const rawPage = searchParams.get("page");
  const page = rawPage === null ? 1 : Number(rawPage);

  // 포맷이 먼저 좁힌다 — 태그 목록도 그 안에서 집계해야 고른 순간 빈 목록이 나오지 않는다.
  // (전역 태그를 쓰면 여기 없는 태그가 나온다.)
  const pool = filterByFormat(items, activeFormat);
  const tags = collectTags(pool);
  const filtered = filterByTag(pool, activeTag);
  const { items: visible, totalPages, isOutOfRange } = paginate(filtered, page);

  // 모르는 포맷도 slug 그대로 되읽어 준다 — 조용히 무시하면 빈 목록의 이유가 사라진다.
  const formatName = activeFormat
    ? (getFormat(activeFormat)?.name ?? activeFormat)
    : undefined;
  // 좁힌 조건을 문장에 그대로 싣는다. "글이 없습니다"만으로는 왜 비었는지 알 수 없다.
  const narrowed = [formatName, activeTag ? `'${activeTag}' 태그` : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* 포맷은 필터 칩이 없다 (라우트도 없다) — 켜져 있다는 사실과 끄는 길만 한 줄로 남긴다. */}
      {formatName ? (
        <p className="voice-ui text-muted">
          포맷 <span className="text-heading">{formatName}</span> 만 봅니다 ·{" "}
          <Link
            href={listHref(basePath, { tag: activeTag })}
            className="underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            포맷 해제
          </Link>
        </p>
      ) : null}

      <TagFilter
        tags={tags}
        activeTag={activeTag}
        format={activeFormat}
        basePath={basePath}
      />

      {isOutOfRange ? (
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="text-sm text-body">
            해당 페이지에 글이 없습니다. 전체 {totalPages}페이지입니다.
          </p>
          <Link
            href={listHref(basePath, {
              tag: activeTag,
              format: activeFormat,
              page: 1,
            })}
            className="mt-2 inline-block text-sm text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus"
          >
            1페이지로 이동
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted">
          {narrowed
            ? `${narrowed}에 해당하는 글이 없습니다.`
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
              href={listHref(basePath, {
                tag: activeTag,
                format: activeFormat,
                page: page - 1,
              })}
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
              href={listHref(basePath, {
                tag: activeTag,
                format: activeFormat,
                page: page + 1,
              })}
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
