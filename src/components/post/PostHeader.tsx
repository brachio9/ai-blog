import Link from "next/link";
import type { ReactNode } from "react";

import { ACCENT_RULE, ACCENT_TEXT } from "@/components/post/PostTable";
import { categoryHref, type Category } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/types/content";

export interface PostHeaderProps {
  post: Post;
  category: Category;
  /**
   * 조회수 자리. 런타임 값이라 페이지가 클라이언트 컴포넌트를 끼워 넣는다 —
   * 이 머리 자체는 서버에서 정적으로 그려진다.
   */
  views?: ReactNode;
}

/**
 * 글 머리 — 이 글이 무엇인지 첫 화면에서 밝힌다.
 *
 * 논문은 arXiv ID·저자가 첫 번째 식별 정보라 제목 바로 아래에 둔다 (docs/PRD.md 핵심 기능 3).
 * 태그·출처 도메인은 여기 적지 않는다 — 우측 레일의 글 정보가 맡는다 (같은 것을 두 번 적지 않는다).
 */
export function PostHeader({ post, category, views }: PostHeaderProps) {
  const { frontmatter } = post;
  const { paper } = frontmatter;

  return (
    <header className="max-w-[68ch] border-b border-border pb-6">
      {/* 색만으로 알리지 않는다 — 규칙선·색과 함께 카테고리 이름을 적는다. */}
      <Link
        href={categoryHref(category)}
        className={`inline-block border-l-2 pl-2 text-xs font-medium underline-offset-[0.3em] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-focus ${ACCENT_RULE[category.accent]} ${ACCENT_TEXT[category.accent]}`}
      >
        {category.name}
      </Link>

      {/* 본문과 같은 세리프. 한글이 어절 중간에서 끊기지 않는 것은 globals.css 의 keep-all 이 맡는다. */}
      <h1 className="mt-3 font-serif text-2xl font-semibold text-heading md:text-3xl">
        {frontmatter.title}
      </h1>

      <p className="mt-3 text-[1.0625rem] leading-[1.75] text-muted">
        {frontmatter.summary}
      </p>

      {paper ? (
        /* 출처 블록의 링크와 역할이 다르다 — 저기는 '어디서 왔는가', 여기는 '어느 논문인가' 다. */
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-xs text-heading tabular-nums">
            arXiv:{paper.arxivId}
          </span>
          <span aria-hidden="true" className="text-faint">
            ·
          </span>
          <span className="text-sm text-muted">{paper.authors.join(", ")}</span>
        </p>
      ) : null}

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted tabular-nums">
        <time dateTime={frontmatter.publishedAt}>
          발행 {formatDate(frontmatter.publishedAt)}
        </time>
        {frontmatter.updatedAt ? (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={frontmatter.updatedAt}>
              수정 {formatDate(frontmatter.updatedAt)}
            </time>
          </>
        ) : null}
        <span aria-hidden="true">·</span>
        <span>읽기 {post.readingMinutes}분</span>
        {/* 조회수는 자기 앞에 구분 기호를 달고 온다. 없으면 이 줄에서 조용히 사라진다. */}
        {views}
      </p>
    </header>
  );
}
