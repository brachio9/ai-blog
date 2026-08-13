import Link from "next/link";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import type { Post } from "@/types/content";

export interface PostNavProps {
  /** 같은 카테고리의 더 오래된 글 */
  previous?: Post;
  /** 같은 카테고리의 더 최신 글 */
  next?: Post;
}

/** 첫 글·마지막 글에서는 한쪽이 없다. 빈 링크를 만들지 말고 자리를 비운다. */
export function PostNav({ previous, next }: PostNavProps) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      aria-label="이전 다음 글"
      // 본문 단폭에 맞춘다 — 본문보다 넓으면 글의 끝이 흐려진다.
      className="mt-12 grid max-w-[68ch] gap-4 border-t border-border pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <PostNavLink post={previous} label="이전 글" direction="previous" />
      ) : null}

      {next ? (
        <PostNavLink
          post={next}
          label="다음 글"
          direction="next"
          // 이전 글이 없으면 다음 글이 왼쪽으로 흘러온다 — 오른쪽 칸에 고정한다.
          className={previous ? undefined : "sm:col-start-2"}
        />
      ) : null}
    </nav>
  );
}

function PostNavLink({
  post,
  label,
  direction,
  className,
}: {
  post: Post;
  label: string;
  direction: "previous" | "next";
  className?: string;
}) {
  const isNext = direction === "next";
  const classes = [
    "group rounded-md border border-border p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent",
    isNext ? "text-right" : undefined,
    className,
  ].filter((item) => item !== undefined);

  return (
    <Link
      href={`/${post.category}/${post.slug}`}
      rel={isNext ? "next" : "prev"}
      className={classes.join(" ")}
    >
      <span
        className={`flex items-center gap-1.5 text-sm text-muted${
          isNext ? " justify-end" : ""
        }`}
      >
        {isNext ? null : <ArrowLeftIcon size={16} className="shrink-0" />}
        {label}
        {isNext ? <ArrowRightIcon size={16} className="shrink-0" /> : null}
      </span>

      <span className="mt-1 block text-base font-medium text-heading transition-colors group-hover:text-accent">
        {post.frontmatter.title}
      </span>
    </Link>
  );
}
