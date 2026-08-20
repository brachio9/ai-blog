import Link from "next/link";

import { axisHref, axisNumber, getAxis } from "@/lib/axes";
import { CAT_CLASS, getCategory } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import { postHref } from "@/lib/pagination";
import { axisTrust, showsCrossSources } from "@/lib/selection";
import type { Post } from "@/types/content";

import { PostThumb } from "./PostThumb";
import { ViewCell } from "./ViewCounts";

/**
 * 행의 성격. **밀도가 아니라 목적이 가른다.**
 *
 * - `feed` — 훑는 면(홈). 그림·번호·제목·요약 한 줄·메타.
 * - `index` — 되찾는 면(`/archive` · `/topics` · `/search` · `/sources`).
 *   번호·날짜·제목·구분 넷뿐이다. 여기에 썸네일 스무 개를 얹으면 목적을 방해한다 —
 *   **「균일한 피드」는 홈의 결정이지 사이트 전체의 결정이 아니다.**
 */
export type RowDensity = "feed" | "index";

export interface PostRowProps {
  post: Post;
  density?: RowDensity;
  /** 조회수 칸을 예약할지. 값은 감싸는 `<ViewCounts>` 가 런타임에 채운다 */
  reserveViews?: boolean;
}

/**
 * 목록의 유일한 행 — 홈·아카이브·주제·출처·검색이 전부 이것을 쓴다.
 *
 * **모든 행이 같은 크기다.** 머리기사도, 요약을 펴는 행도, 접는 행도 없다.
 * 행이 다른 것은 크기가 아니라 **어떤 부호를 달고 있는가**뿐이다.
 * 요약을 행마다 켜고 끄던 것을 그만둔 것이 이 개편의 요점이다 — 그게 곧 비균일이었다.
 *
 * 행 높이를 정하는 것은 썸네일이 아니라 **세 줄짜리 텍스트 블록**이다 (design/stitch/NOTES.md).
 * 그래서 요약은 반드시 한 줄로 자른다 — 두 줄이 되는 순간 그 행만 커진다.
 *
 * 제목 왼쪽에 오는 것은 전부 폭이 고정된 열이다 (그림 80px · 번호 26px).
 * 그것이 스무 행을 훑을 수 있게 만드는 유일한 장치다.
 */
export function PostRow({
  post,
  density = "feed",
  reserveViews = false,
}: PostRowProps) {
  const { frontmatter } = post;
  const category = getCategory(post.category);
  const axis = getAxis(frontmatter.axis);
  const catClass = category ? CAT_CLASS[category.accent] : "";

  const number = axis ? (
    <Link
      href={axisHref(axis)}
      aria-label={`주제 ${axis.name}`}
      className="text-heading transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-focus"
    >
      {axisNumber(axis)}
    </Link>
  ) : null;

  const title = (
    <Link
      href={postHref(post.slug)}
      className="underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
    >
      {frontmatter.title}
    </Link>
  );

  if (density === "index") {
    return (
      <li className={`index-row ${catClass}`}>
        {/* 좁은 화면에서는 이 칸만 왼쪽에 서고 나머지가 오른쪽에 쌓인다 (globals.css). */}
        <span className="index-no voice-source">{number}</span>
        <time dateTime={frontmatter.publishedAt} className="voice-source">
          {formatDateShort(frontmatter.publishedAt)}
        </time>
        <span className="t">{title}</span>
        {/* 색만으로 알리지 않는다. 네 열 중 이 열만 폭이 내용에 맞춰 줄어든다. */}
        <span className="cat-label">{category?.shortName}</span>
      </li>
    );
  }

  const trust = axisTrust(post.category, frontmatter.selection);
  const popularity = frontmatter.selection?.popularity;

  return (
    <li className={`row ${catClass}`}>
      <PostThumb post={post} />
      <span className="row-no voice-source">{number}</span>

      <div className="row-text">
        <h3 className="row-title">{title}</h3>
        <p className="row-summary">{frontmatter.summary}</p>

        {/* 메타는 두 무리다. 왼쪽은 「무엇인가」, 오른쪽은 「왜 골랐나」.
            **「추린 비율」이 왼쪽 무리의 마지막 칸이라 없어도 뒤에서 밀릴 것이 없다** —
            80편 중 39편이 비어 있는데도 자리를 예약하거나 `—` 를 찍을 필요가 사라진다
            (design/stitch/NOTES.md ⑤). */}
        <div className="row-meta voice-source">
          <span className="row-meta-left">
            <time dateTime={frontmatter.publishedAt}>
              {formatDateShort(frontmatter.publishedAt)}
            </time>
            <span className="cat-label">{category?.shortName}</span>
            <span>{post.readingMinutes}분</span>
            {post.ratio !== null ? (
              <span className="ratio">추림 {post.ratio}:1</span>
            ) : null}
          </span>

          <span className="row-meta-right">
            {showsCrossSources(frontmatter.selection) ? (
              <span>교차 {frontmatter.selection?.crossSources}곳</span>
            ) : null}
            {popularity ? (
              <span aria-label={`원문 추천 ${popularity.count}`}>
                ▲{popularity.count}
              </span>
            ) : null}
            {/* 약한 축이라고 목록에서 빼지 않는다 — 여섯 축 편수의 합이 전체와 같아야
                /topics 가 지도 노릇을 한다. 감추는 대신 표시한다. */}
            {trust === "weak" ? (
              <abbr title="주제를 기계가 한 경로만 보고 정했다" className="row-weak">
                †
              </abbr>
            ) : null}
            {reserveViews ? <ViewCell postId={post.slug} label="조회" /> : null}
          </span>
        </div>
      </div>
    </li>
  );
}
