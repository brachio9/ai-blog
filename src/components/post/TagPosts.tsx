"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { filterByTag, listHref } from "@/lib/pagination";

import { toPost, type PostListItem } from "./PostList";
import { PostTable } from "./PostTable";

export interface TagPostsProps {
  items: PostListItem[];
  /** 태그 링크의 기준 경로. 색인 목록과 같은 `?tag=` 규약을 쓴다. */
  basePath: string;
}

/**
 * 태그 색인에서 고른 태그의 글. 태그는 카테고리를 가로지르므로 구분 열을 켠다.
 *
 * 고른 태그는 URL(`?tag=`)에만 있다 — 서버에서 읽으면 페이지가 통째로 동적이 되어
 * 정적 생성이 사라진다 (카테고리 목록과 같은 이유). 쓰는 쪽은 <Suspense> 로 감싼다.
 * 태그 목록 자체는 서버가 그린다 — 색인이 이 페이지의 본체라 정적 HTML 에 있어야 한다.
 */
export function TagPosts({ items, basePath }: TagPostsProps) {
  const searchParams = useSearchParams();

  // get() 은 인코딩된 한글 태그를 자동으로 디코딩해 준다.
  const tag = searchParams.get("tag") ?? undefined;

  if (!tag) {
    return (
      <p className="text-sm text-muted">
        위에서 태그를 고르면 그 태그가 붙은 글이 여기에 모입니다.
      </p>
    );
  }

  const posts = filterByTag(items, tag);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-xl font-semibold text-heading">{tag}</h2>
        <Link
          href={listHref(basePath, {})}
          className="text-sm text-muted transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-focus"
        >
          선택 해제
        </Link>
      </div>

      {posts.length > 0 ? (
        <>
          <p className="font-mono text-xs text-muted tabular-nums">
            {posts.length}편
          </p>
          {/* 태그로 좁혀 본 목록도 되찾기다 — 아카이브와 같은 밀도·같은 구성으로 싣는다. */}
          <PostTable
            posts={posts.map(toPost)}
            showCategory
            showMeta={false}
            caption={`'${tag}' 태그의 글`}
          />
        </>
      ) : (
        <p className="text-sm text-muted">{`'${tag}' 태그의 글이 없습니다.`}</p>
      )}
    </div>
  );
}
