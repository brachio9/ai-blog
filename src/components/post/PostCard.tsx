import Image from "next/image";
import Link from "next/link";

import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/types/content";

export interface PostCardProps {
  post: Post;
  /** 카테고리 배지 표시 여부. 카테고리 페이지 안에서는 불필요하므로 끌 수 있어야 한다. */
  showCategory?: boolean;
}

/** 카드에서 태그를 다 늘어놓으면 제목이 밀린다. 나머지는 글 상세에서 본다. */
const MAX_TAGS = 3;

/** 커버 원본 비율을 모르므로 16:9 로 자른다. 실제 크기는 CSS 가 정한다. */
const COVER_WIDTH = 640;
const COVER_HEIGHT = 360;

/** 목록·검색이 공유하는 글 카드. 글 상세 URL 규약은 `/{category}/{slug}` 다. */
export function PostCard({ post, showCategory = false }: PostCardProps) {
  const { frontmatter } = post;
  const category = showCategory ? getCategory(post.category) : undefined;
  const tags = frontmatter.tags.slice(0, MAX_TAGS);

  return (
    <article className="h-full">
      <Link
        href={`/${post.category}/${post.slug}`}
        className="group flex h-full flex-col rounded-md border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        {frontmatter.cover ? (
          // 제목이 바로 아래에 있으므로 커버는 장식이다 — alt 를 비워 중복 낭독을 막는다.
          <Image
            src={frontmatter.cover}
            alt=""
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
            className="mb-4 aspect-video w-full rounded-sm border border-border bg-bg object-cover"
          />
        ) : null}

        {category ? (
          <span className="mb-3 self-start rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
            {category.name}
          </span>
        ) : null}

        <h3 className="text-base font-medium text-heading transition-colors group-hover:text-accent">
          {frontmatter.title}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
          {frontmatter.summary}
        </p>

        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <time dateTime={frontmatter.publishedAt}>
            {formatDate(frontmatter.publishedAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes}분</span>
        </p>

        {tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </article>
  );
}
