import Link from "next/link";

import { CAT_CLASS, getCategory, type CategoryAccent } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
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

/**
 * 카테고리 색 클래스 — globals.css 의 `--cat-*` 를 Tailwind 유틸리티로 받는다.
 * Tailwind 는 런타임에 조합한 클래스 문자열을 만들어 주지 않으므로 accent 키로 고른다.
 *
 * 항목 안에서는 이 맵이 아니라 `CAT_CLASS`(--cat 을 정하는 `.cat-*`)를 쓴다 —
 * 여기 있는 안료는 아직 600 단계라 본문 크기 텍스트에는 대비가 모자란다.
 * 남은 호출부(홈·소개·아카이브 머리글·글 상세)는 각자의 step 이 옮긴다.
 */
export const ACCENT_TEXT: Record<CategoryAccent, string> = {
  paper: "text-cat-paper",
  release: "text-cat-release",
  news: "text-cat-news",
  community: "text-cat-community",
  note: "text-cat-note",
};

export const ACCENT_RULE: Record<CategoryAccent, string> = {
  paper: "border-l-cat-paper",
  release: "border-l-cat-release",
  news: "border-l-cat-news",
  community: "border-l-cat-community",
  note: "border-l-cat-note",
};

/** 레일 둘째 줄에 남기는 원문 식별자. 논문 목록에서만 켠다. */
function identifierOf(post: Post, showIdentifier: boolean): string {
  const { paper } = post.frontmatter;

  return showIdentifier && paper ? `arXiv:${paper.arxivId}` : "";
}

/**
 * 목록의 기본 단위 — 좌측 레일(원문의 목소리) + 본문(초록의 목소리)로 된 항목이다.
 * 레일 폭(`--rail`)이 고정이라 행 높이가 글마다 달라져도 **제목의 왼쪽 끝은 흔들리지 않는다.**
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
        const identifier = identifierOf(post, showIdentifier);
        // 조회수 저장소의 post_id 는 글 상세 URL 과 같은 `{category}/{slug}` 다 (services/turso.ts).
        const postId = `${post.category}/${post.slug}`;

        return (
          <li
            key={postId}
            className={`entry ${category ? CAT_CLASS[category.accent] : ""}`}
          >
            <div className="entry-rail voice-source">
              <time dateTime={frontmatter.publishedAt}>
                {formatDateShort(frontmatter.publishedAt)}
              </time>
              {identifier ? <div>{identifier}</div> : null}
            </div>

            <div className="min-w-0">
              {/* 구분은 제목 위에 한 줄로 올린다. 제목 앞에 달아 붙이면 줄은 아끼지만
                  라벨 폭만큼 제목이 밀리고, 짧은 이름이 2자/3자로 갈리는 순간
                  같은 목록 안에서 제목의 왼쪽 끝이 흔들린다 (docs/PRD.md 는 2~3자를 허용한다).
                  색만으로 알리지 않으므로 짧은 이름이 텍스트로 함께 간다. */}
              {showCategory && category ? (
                <div className="cat-label">{category.shortName}</div>
              ) : null}

              <Link
                href={`/${post.category}/${post.slug}`}
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
