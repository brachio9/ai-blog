import Link from "next/link";

import { CAT_CLASS, getCategory } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import type { Post } from "@/types/content";

/**
 * 색인 — 날짜 · 제목 · 구분 3열. 훑어서 되찾는 것이 유일한 목적이라 그 밖의 것은 싣지 않는다.
 * 세 급 중 가장 밀집하며 행 자체가 자기 밀도를 갖는다 (.list-* 로 덮지 않는다).
 *
 * `<li>` 를 돌려주므로 쓰는 쪽이 이름 붙인 `<ul>` 로 감싼다.
 */
export function PostIndexRow({ post }: { post: Post }) {
  const { frontmatter } = post;
  const category = getCategory(post.category);

  return (
    <li className={`index-row ${category ? CAT_CLASS[category.accent] : ""}`}>
      <time dateTime={frontmatter.publishedAt} className="voice-source">
        {formatDateShort(frontmatter.publishedAt)}
      </time>

      <Link
        href={`/${post.category}/${post.slug}`}
        className="t underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      >
        {frontmatter.title}
      </Link>

      {/* 색만으로 알리지 않는다. 세 열 중 이 열만 폭이 내용에 맞춰 줄어든다. */}
      <span className="cat-label">{category?.shortName}</span>
    </li>
  );
}
