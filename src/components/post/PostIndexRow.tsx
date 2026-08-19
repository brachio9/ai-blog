import Link from "next/link";

import { axisHref, axisNumber, getAxis } from "@/lib/axes";
import { CAT_CLASS, getCategory } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import type { Post } from "@/types/content";
import { postHref } from "@/lib/pagination";

/**
 * 색인 — 번호 · 날짜 · 제목 · 구분 4열. 훑어서 되찾는 것이 유일한 목적이라 그 밖의 것은 싣지 않는다.
 *
 * **축 번호가 맨 앞에 서는 것은 `.entry` 와 같은 이유다** — 두 자리 고정폭이라 열이 흔들리지
 * 않고, 훑어 내려갈 때 숫자 한 열이 라벨보다 빨리 읽힌다. 여기를 빼면 되찾는 면
 * (`/archive` · `/search`)에서만 1급 차원이 안 보이게 된다.
 * 세 급 중 가장 밀집하며 행 자체가 자기 밀도를 갖는다 (.list-* 로 덮지 않는다).
 *
 * `<li>` 를 돌려주므로 쓰는 쪽이 이름 붙인 `<ul>` 로 감싼다.
 */
export function PostIndexRow({ post }: { post: Post }) {
  const { frontmatter } = post;
  const category = getCategory(post.category);
  const axis = getAxis(frontmatter.axis);

  return (
    <li className={`index-row ${category ? CAT_CLASS[category.accent] : ""}`}>
      {/* 좁은 화면에서는 이 칸만 왼쪽에 서고 나머지가 오른쪽에 쌓인다 (globals.css). */}
      <span className="index-no voice-source">
        {axis ? (
          <Link
            href={axisHref(axis)}
            aria-label={`주제 ${axis.name}`}
            className="text-heading transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-focus"
          >
            {axisNumber(axis)}
          </Link>
        ) : null}
      </span>

      <time dateTime={frontmatter.publishedAt} className="voice-source">
        {formatDateShort(frontmatter.publishedAt)}
      </time>

      <Link
        href={postHref(post.slug)}
        className="t underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      >
        {frontmatter.title}
      </Link>

      {/* 색만으로 알리지 않는다. 세 열 중 이 열만 폭이 내용에 맞춰 줄어든다. */}
      <span className="cat-label">{category?.shortName}</span>
    </li>
  );
}
