import Link from "next/link";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { postHref } from "@/lib/pagination";
import type { Post } from "@/types/content";

export interface PostNavProps {
  /** 같은 카테고리의 더 오래된 글 */
  previous?: Post;
  /** 같은 카테고리의 더 최신 글 */
  next?: Post;
  /**
   * 이어지는 범위. 이전/다음은 **같은 카테고리 안에서만** 이어지므로
   * 그 이름을 라벨에 적어 어디까지가 한 줄기인지 화면에서 바로 읽히게 한다.
   */
  categoryName: string;
}

/** 첫 글·마지막 글에서는 한쪽이 없다. 빈 링크를 만들지 말고 자리를 비운다. */
export function PostNav({ previous, next, categoryName }: PostNavProps) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      aria-label={`${categoryName} 이전 다음 글`}
      // 본문 단폭에 맞춘다 — 본문보다 넓으면 글의 끝이 흐려진다.
      className="mt-12 grid max-w-[68ch] gap-4 border-t border-border pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <PostNavLink
          post={previous}
          label={`${categoryName}에서 이전 글`}
          direction="previous"
        />
      ) : null}

      {next ? (
        <PostNavLink
          post={next}
          label={`${categoryName}에서 다음 글`}
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
    "group rounded-md border border-border p-4 transition-colors hover:border-muted focus-visible:outline-2 focus-visible:outline-focus",
    isNext ? "text-right" : undefined,
    className,
  ].filter((item) => item !== undefined);

  return (
    <Link
      href={postHref(post.slug)}
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

      <span className="mt-1 block text-base font-medium text-heading underline-offset-[0.2em] group-hover:underline">
        {post.frontmatter.title}
      </span>
    </Link>
  );
}
