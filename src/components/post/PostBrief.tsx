import Link from "next/link";

import { CAT_CLASS, getCategory } from "@/lib/categories";
import { formatDateMonthDay } from "@/lib/format";
import type { Post } from "@/types/content";
import { postHref } from "@/lib/pagination";

/**
 * 단신 — 날짜 + 구분 + 제목 한 줄. 짧은 것들을 뭉쳐 한 상자에 넣을 때 쓴다.
 * 요약도 읽기 시간도 싣지 않는다. 한 줄을 넘기는 순간 단신이 아니다.
 *
 * `<li>` 를 돌려주므로 쓰는 쪽이 `.brief-set` 인 `<ul>` 로 감싼다.
 */
export function PostBrief({ post }: { post: Post }) {
  const { frontmatter } = post;
  const category = getCategory(post.category);

  return (
    <li className={`brief-item ${category ? CAT_CLASS[category.accent] : ""}`}>
      {/* 묶음 안에서는 연도가 이미 정해져 있다 — 월·일만 남겨 레일을 좁게 쓴다. */}
      <time dateTime={frontmatter.publishedAt} className="voice-source">
        {formatDateMonthDay(frontmatter.publishedAt)}
      </time>

      <div className="min-w-0">
        {/* 색만으로 구분을 알리지 않는다 — 짧은 이름을 텍스트로 함께 둔다. */}
        {category ? (
          <span className="cat-label mr-[var(--space-2)]">
            {category.shortName}
          </span>
        ) : null}
        <Link
          href={postHref(post.slug)}
          className="entry-title underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {frontmatter.title}
        </Link>
      </div>
    </li>
  );
}
