import Link from "next/link";

import { CAT_CLASS, getCategory } from "@/lib/categories";
import { compressionRatio, countBodyChars } from "@/lib/content/compression";
import { formatDateShort } from "@/lib/format";
import type { Post } from "@/types/content";

/** 시그니처 「추린 비율」의 계산 결과. 규칙은 src/lib/content/compression.ts 한 곳에만 있다. */
export type RatioInfo = NonNullable<ReturnType<typeof compressionRatio>>;

export interface PostLeadProps {
  post: Post;
  /**
   * 미리 구한 추린 비율. 넘기지 않으면 `post.body` 에서 직접 구한다.
   * `null` 을 넘기면 그리지 않는다 — 본문 없이 목록 항목만 들고 있는 쪽이 쓴다.
   */
  ratio?: RatioInfo | null;
}

/**
 * 요약을 부제와 리드로 가른다. 첫 문장이 부제, 나머지가 리드다 —
 * 리드까지 읽으면 본문을 안 읽어도 무슨 얘긴지 알아야 한다 (design/brief.md).
 * 한 문장뿐이면 부제만 남는다. 없는 리드를 지어내지 않는다.
 */
function splitSummary(summary: string): { deck: string; lede: string | null } {
  const end = summary.indexOf(". ");
  if (end === -1) {
    return { deck: summary, lede: null };
  }

  return { deck: summary.slice(0, end + 1), lede: summary.slice(end + 2) };
}

/**
 * 머리기사 — **지면당 하나.** 둘이 되는 순간 편집이 아니라 나열이다 (design/brief.md 시그니처 03).
 * 표제/부제/리드 3단이 전부 들어가고, 급은 스케일 밖으로 커진다 (.entry-lead .headline).
 * 누가 머리기사인지 고르는 것은 지면(홈)의 몫이고 여기서는 정하지 않는다.
 */
export function PostLead({ post, ratio }: PostLeadProps) {
  const { frontmatter } = post;
  const category = getCategory(post.category);
  const { deck, lede } = splitSummary(frontmatter.summary);

  // 비율 계산은 compression.ts 에만 있다. 넘겨받은 값이 있으면 그것이 이긴다 (null 도 값이다).
  const compression =
    ratio !== undefined
      ? ratio
      : compressionRatio(frontmatter.source?.words, countBodyChars(post.body));

  return (
    <article
      className={`entry-lead ${category ? CAT_CLASS[category.accent] : ""}`}
    >
      {/* 데이트라인 — 날짜·식별자·비율이 표제 앞에 한 덩이로 붙는다.
          한글은 산세리프, 남겨 둔 원문(날짜·식별자·수치)은 mono. 두 목소리를 섞지 않는다. */}
      <div className="dateline">
        {category ? <span className="cat-label">{category.name}</span> : null}

        <time dateTime={frontmatter.publishedAt} className="voice-source">
          {formatDateShort(frontmatter.publishedAt)}
        </time>

        {frontmatter.paper ? (
          <span className="voice-source">
            arXiv:{frontmatter.paper.arxivId}
          </span>
        ) : null}

        {/* 원문 단어 수가 없는 글은 비율이 없는 것이 정상이다 — 자리도 비우지 않는다. */}
        {compression ? (
          <span className="voice-ui text-[var(--cat)]">
            추림 <span className="ratio">{compression.ratio}:1</span>
          </span>
        ) : null}
      </div>

      <h2 className="headline">
        <Link
          href={`/${post.category}/${post.slug}`}
          className="underline-offset-[0.12em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {frontmatter.title}
        </Link>
      </h2>

      <p className="deck">{deck}</p>
      {lede ? <p className="lede">{lede}</p> : null}
    </article>
  );
}
