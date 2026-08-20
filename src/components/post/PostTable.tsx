import Link from "next/link";

import { axisHref, axisNumber, getAxis } from "@/lib/axes";
import { CAT_CLASS, getCategory } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import { postHref } from "@/lib/pagination";
import type { Post } from "@/types/content";

import { ViewCell } from "./ViewCounts";

export interface PostTableProps {
  posts: Post[];
  /** 카테고리 페이지 안에서는 구분 라벨이 불필요하다 */
  showCategory?: boolean;
  /** 논문 목록에서 arXiv ID 를 레일 둘째 줄에 보인다 */
  showIdentifier?: boolean;
  /** 요약 한 줄을 함께 싣는다. 여유 있게 여는 화면(.list-loose)에서만 켠다 */
  showSummary?: boolean;
  /**
   * 읽기 시간·조회수 줄을 붙일지. 되찾기가 목적인 촘촘한 목록에서는 끈다 —
   * 밀도는 간격만이 아니라 **무엇을 싣는가**로도 정해진다 (design/components/entries.html).
   */
  showMeta?: boolean;
  /** 조회수를 실을지. 값은 감싸는 <ViewCounts> 가 런타임에 채운다 */
  reserveViews?: boolean;
  /** 목록의 접근 가능한 이름. 한 화면에 목록이 둘 이상이면 서로 달라야 한다. */
  caption?: string;
}

/** 레일 둘째 줄에 남기는 원문 식별자. 논문 목록에서만 켠다. */
function identifierOf(post: Post, showIdentifier: boolean): string {
  const { paper } = post.frontmatter;

  return showIdentifier && paper ? `arXiv:${paper.arxivId}` : "";
}

/**
 * 목록의 기본 단위 — 좌측 레일(원문의 목소리) + 본문(초록의 목소리)로 된 항목이다.
 * 레일 폭(`--rail`)이 고정이라 행 높이가 글마다 달라져도 **제목의 왼쪽 끝은 흔들리지 않는다.**
 *
 * 레일 첫 줄이 **주제 축의 두 자리 번호**다 (2026-08-19). 옛 규칙은 「목록에 축을 싣지
 * 마라」였고 근거는 blog-7 의 실측 — 제목의 왼쪽 끝이 흔들린다 — 이었는데, 그때 실제로
 * 흔들린 것은 **폭이 변하는 라벨이 제목과 같은 줄에 선 것**이었다 (`shortName` 이 2~4자로
 * 갈린다). 라벨이 하나 더 있는 것이 문제가 아니었다. `axisNumber()` 는 언제나 두 자리
 * mono 이고 레일은 고정폭 열이라, 여기 넣으면 흔들릴 수가 없다.
 * 카테고리 라벨은 그래서 제목 위가 아니라 아래 `.entry-meta` 로 내려간다.
 * 행 높이를 억지로 맞추지 않는 것이 요점이다 — 무엇을 얼마나 크게 싣는지가 편집이다.
 *
 * 밀도는 이 컴포넌트가 정하지 않는다. 감싸는 쪽이 `.list-tight` / `.list-loose` 로 덮는다
 * (`--entry-pad` 는 상속되므로 목록 바깥 어디에 붙여도 된다).
 * 좁은 화면에서는 레일이 제목 위로 접힌다 — 목록에서 가로 스크롤은 스캔을 방해한다.
 */
export function PostTable({
  posts,
  showCategory = false,
  showIdentifier = false,
  showSummary = false,
  showMeta = true,
  reserveViews = false,
  caption = "글 목록",
}: PostTableProps) {
  return (
    // 항목이 display:grid 라 브라우저가 목록 의미를 떨어뜨릴 수 있다 — role 로 되돌린다.
    <ul role="list" aria-label={caption}>
      {posts.map((post) => {
        const { frontmatter } = post;
        const category = getCategory(post.category);
        const axis = getAxis(frontmatter.axis);
        const identifier = identifierOf(post, showIdentifier);
        // 조회수 저장소의 post_id 는 글 상세 URL 과 같은 `{category}/{slug}` 다 (services/turso.ts).
        const postId = post.slug;

        return (
          <li
            key={postId}
            className={`entry ${category ? CAT_CLASS[category.accent] : ""}`}
          >
            <div className="entry-rail voice-source">
              {/* 축의 부호는 번호다 — 안료는 카테고리 전용이라 여섯 축에 나눠 줄 색이 없다.
                  스무 행을 훑을 때 두 자리 숫자 한 열은 다섯 색 스무 칩보다 빨리 읽힌다. */}
              {axis ? (
                <Link
                  href={axisHref(axis)}
                  aria-label={`주제 ${axis.name}`}
                  className="block text-[length:var(--text-h5)] text-heading transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {axisNumber(axis)}
                </Link>
              ) : null}
              <time dateTime={frontmatter.publishedAt}>
                {formatDateShort(frontmatter.publishedAt)}
              </time>
              {identifier ? <div>{identifier}</div> : null}
            </div>

            <div className="min-w-0">
              <Link
                href={postHref(post.slug)}
                className="entry-title block underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
              >
                {frontmatter.title}
              </Link>

              {showSummary ? (
                <p className="mt-[var(--space-1)] max-w-[54ch] text-[length:var(--text-small)] leading-[var(--leading-tight)] text-muted">
                  {frontmatter.summary}
                </p>
              ) : null}

              {showMeta ? (
                <div className="entry-meta mt-[var(--space-1)]">
                  {/* 축은 두 벌로 나온다 — 레일의 번호는 훑어 내려가는 것이고 여기 이름은 읽는 것이다.
                      두 번 보면 `04` 가 에이전트라는 것을 외우게 된다 (신문의 섹션 번호와 같다). */}
                  {axis ? (
                    <span className="voice-ui text-muted">{axis.shortName}</span>
                  ) : null}

                  {/* 카테고리는 안료와 라벨을 유지한 채 자리만 내려온다 —
                      **강등은 삭제가 아니라 배치로 표현한다.** 색만으로 알리지 않는다는
                      규칙도 그대로다 (짧은 이름이 텍스트로 함께 간다). */}
                  {showCategory && category ? (
                    <span className="cat-label">{category.shortName}</span>
                  ) : null}

                  <span className="voice-ui text-muted">
                    <span className="voice-source">{post.readingMinutes}</span>분
                  </span>

                  {/* 조회수는 런타임 값이라 서버에서 읽지 않는다 — 감싸는 <ViewCounts> 가 채운다.
                      못 받으면 라벨째 사라진다. 줄 끝에 붙으므로 늦게 들어와도 앞이 밀리지 않는다. */}
                  {reserveViews ? (
                    <ViewCell postId={postId} label="조회" />
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
