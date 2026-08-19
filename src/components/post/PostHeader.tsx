import Link from "next/link";
import type { ReactNode } from "react";

import { type RatioInfo, splitSummary } from "@/components/post/PostLead";
import { axisHref, getAxis } from "@/lib/axes";
import { CAT_CLASS, categoryHref, type Category } from "@/lib/categories";
import { compressionRatio, countBodyChars } from "@/lib/content/compression";
import { formatCount, formatDateShort } from "@/lib/format";
import {
  axisTrust,
  POPULARITY_LABEL,
  showsCrossSources,
} from "@/lib/selection";
import type { Post } from "@/types/content";

export interface PostHeaderProps {
  post: Post;
  category: Category;
  /**
   * 조회수 자리. 런타임 값이라 페이지가 클라이언트 컴포넌트를 끼워 넣는다 —
   * 이 머리 자체는 서버에서 정적으로 그려진다.
   */
  views?: ReactNode;
  /**
   * 미리 구한 추린 비율. 넘기지 않으면 `post.body` 에서 직접 구한다.
   * 확장형 막대를 그리는 출처 표기와 같은 값을 써야 하므로 지면이 한 번 구해 나눠 준다.
   */
  ratio?: RatioInfo | null;
}

/**
 * 기사면의 머리 — 데이트라인 · 표제 · 부제 · 리드 (design/components/article.html).
 * 긴장 축에서 가장 오른쪽이라 1면의 머리기사와 같은 재료를 쓰되 급이 반대다:
 * 1면은 표제가 스케일 밖(clamp 54px)까지 커지고, 여기서는 척도 안(--text-h1)에 선다.
 * 정독하는 자리이지 고르는 자리가 아니기 때문이다.
 *
 * 저자·라이선스·원문 제목은 여기 적지 않는다 — 출처 표기(SourceNote)가 맡는다.
 * 수정일도 여기 없다. 고쳐 실은 기록은 기사 끝의 정정(Correction)이 적는다.
 */
export function PostHeader({ post, category, views, ratio }: PostHeaderProps) {
  const { frontmatter } = post;
  const { paper, selection } = frontmatter;
  const trust = axisTrust(post.category, selection);
  const { deck, lede } = splitSummary(frontmatter.summary);
  const axis = getAxis(frontmatter.axis);

  // 비율 계산은 compression.ts 에만 있다. 넘겨받은 값이 있으면 그것이 이긴다 (null 도 값이다).
  const compression =
    ratio !== undefined
      ? ratio
      : compressionRatio(frontmatter.source?.words, countBodyChars(post.body));

  return (
    // 안료는 클래스로만 들어온다 — --cat 이 .cat-label 과 .ratio 의 색이 된다.
    <header className={`max-w-[var(--measure)] ${CAT_CLASS[category.accent]}`}>
      {/* 데이트라인 — 날짜·식별자·수치가 기사 앞머리에 한 덩이로 붙는다.
          한글은 산세리프, 남겨 둔 원문은 mono. 두 목소리를 섞지 않는다. */}
      <div className="dateline">
        {/* 색만으로 알리지 않는다 — 안료와 함께 카테고리 이름을 적는다. */}
        <Link
          href={categoryHref(category)}
          className="cat-label underline-offset-[0.3em] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {category.name}
        </Link>

        {/* 주제 축 — 이 글이 무엇에 대한 글인가. 카테고리(원문이 어디서 왔는가) 바로 뒤에 선다.
            축은 무채다: 안료 3색은 카테고리 전용이고 축의 부호는 번호인데,
            데이트라인은 자리가 좁아 번호까지 넣지 않는다 — 이름만 적고 번호는 /topics 가 맡는다. */}
        {axis ? (
          <Link
            href={axisHref(axis)}
            className="voice-ui text-muted underline-offset-[0.3em] transition-colors hover:text-heading hover:underline focus-visible:outline-2 focus-visible:outline-focus"
          >
            {axis.name}
            {/* 약한 축에는 단검을 단다 — 각주는 출처 상자가 받는다.
                축이 이 사이트의 1급 차원이 된 이상, 그 축을 본문이 아니라 피드를 보고
                정했다는 사실을 숨기면 지도가 거짓말을 한다. 발행분의 3분의 1이 그렇다. */}
            {trust === "weak" ? (
              <>
                <span className="voice-source" aria-hidden>
                  †
                </span>
                <span className="sr-only"> (자동 분류)</span>
              </>
            ) : null}
          </Link>
        ) : null}

        {/* 여러 곳에서 같이 나온 소식. **1곳은 적지 않는다** — 27%만 2곳 이상이라
            드물다는 것이 이 표시의 값어치다. */}
        {selection && showsCrossSources(selection) ? (
          <span className="voice-ui text-muted">
            <span className="voice-source">{selection.crossSources}</span>곳
          </span>
        ) : null}

        {/* 원문 매체의 반응. **단위 라벨이 출처를 말한다** — 그래서 정렬 키로 쓰지 않는다.
            별과 업보트를 한 줄에 세우면 그 순위는 아무 뜻이 없다. */}
        {selection?.popularity ? (
          <span className="voice-ui text-muted">
            {POPULARITY_LABEL[selection.popularity.kind]}{" "}
            <span className="voice-source">
              {formatCount(selection.popularity.count)}
            </span>
          </span>
        ) : null}

        <time dateTime={frontmatter.publishedAt} className="voice-source">
          {formatDateShort(frontmatter.publishedAt)}
        </time>

        {paper ? (
          <span className="voice-source">arXiv:{paper.arxivId}</span>
        ) : null}

        <span className="voice-ui text-muted">
          읽기 <span className="voice-source">{post.readingMinutes}</span>분
        </span>

        {/* 조회수는 없으면 이 줄에서 조용히 사라진다 — 실패해도 기사는 그대로 뜬다. */}
        {views}

        {/* 원문 단어 수가 없는 글은 비율이 없는 것이 정상이다 — 자리도 비우지 않는다. */}
        {compression ? (
          <span className="voice-ui text-[var(--cat)]">
            추림 <span className="ratio">{compression.ratio}:1</span>
          </span>
        ) : null}
      </div>

      <h1 className="headline mt-[var(--space-3)] text-[length:var(--text-h1)]">
        {frontmatter.title}
      </h1>

      <p className="deck mt-[var(--space-3)]">{deck}</p>
      {lede ? <p className="lede mt-[var(--space-3)]">{lede}</p> : null}

      {/* 머리와 본문을 가르는 굵은선/얇은선 쌍. 기사면에서 이 장식은 여기 한 번뿐이다.
          .rule-pair 의 margin 은 unlayered 라 유틸리티로 덮이지 않는다 — 인라인으로 얹는다. */}
      <div className="rule-pair" style={{ marginTop: "var(--space-5)" }} />
    </header>
  );
}
