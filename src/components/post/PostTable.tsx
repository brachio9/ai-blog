import Link from "next/link";

import { getCategory, type CategoryAccent } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import type { Post } from "@/types/content";

import { ViewCell } from "./ViewCounts";

export interface PostTableProps {
  posts: Post[];
  /** 카테고리 페이지 안에서는 구분 열이 불필요하다 */
  showCategory?: boolean;
  /** 논문 목록에서 arXiv ID 를 식별자 열에 보인다 */
  showIdentifier?: boolean;
  /** 조회수 열을 둘지. 값은 감싸는 <ViewCounts> 가 런타임에 채운다 */
  reserveViews?: boolean;
  /** 표의 접근 가능한 이름. 한 화면에 표가 둘 이상이면 서로 달라야 한다. */
  caption?: string;
}

/**
 * 카테고리 색 클래스 — globals.css 의 `--cat-*` 를 Tailwind 유틸리티로 받는다.
 * Tailwind 는 런타임에 조합한 클래스 문자열을 만들어 주지 않으므로 accent 키로 고른다.
 */
export const ACCENT_TEXT: Record<CategoryAccent, string> = {
  hf: "text-cat-hf",
  paper: "text-cat-paper",
  note: "text-cat-note",
};

const ACCENT_RULE: Record<CategoryAccent, string> = {
  hf: "border-l-cat-hf",
  paper: "border-l-cat-paper",
  note: "border-l-cat-note",
};

/** 식별자 열 폭이 고정이라 더 넣어도 잘린다. */
const MAX_TAGS = 2;

/**
 * align-middle 을 쓴다 — baseline 정렬은 제목 링크가 truncate(overflow:hidden) 라
 * 셀 아래 모서리를 기준선으로 잡아 행이 26px 씩 늘어난다 (실측).
 */
const CELL = "py-2.5 pr-4 align-middle";
const HEAD = "pb-2 pr-4 text-xs font-medium tracking-wide text-muted";
/**
 * 날짜·수치·식별자는 자리가 흔들리면 스캔이 무너진다.
 * 줄바꿈을 막지 않으면 좁은 열에서 날짜가 두 줄로 접혀 행 높이가 갈린다 (실측).
 */
const META = "font-mono text-xs tabular-nums whitespace-nowrap text-muted";

/** 논문이면 arXiv ID, 아니면 태그. 열 하나를 두 용도로 쓴다. */
function identifierOf(post: Post, showIdentifier: boolean): string {
  const { frontmatter } = post;

  if (showIdentifier) {
    return frontmatter.paper ? `arXiv:${frontmatter.paper.arxivId}` : "";
  }
  return frontmatter.tags.slice(0, MAX_TAGS).join(" · ");
}

/**
 * 목록의 기본 단위 — 카드가 아니라 밀집 표다 (docs/UI_GUIDE.md "목록").
 * 행 높이는 전부 같아야 하므로 제목은 한 줄로 자르고, 커버 이미지와 요약문은 싣지 않는다.
 * 좁은 화면에서는 열을 접어 2줄 블록이 된다 — 목록에서 가로 스크롤은 스캔을 방해한다.
 */
export function PostTable({
  posts,
  showCategory = false,
  showIdentifier = false,
  reserveViews = false,
  caption = "글 목록",
}: PostTableProps) {
  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">{caption}</caption>

      {/* 열 폭은 여기서 정해진다 (table-fixed). 모바일에서는 머리글째 접는다. */}
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-b-border">
          <th scope="col" className={`${HEAD} w-[7rem] pl-3`}>
            날짜
          </th>
          {showCategory ? (
            <th scope="col" className={`${HEAD} w-[3.5rem]`}>
              구분
            </th>
          ) : null}
          <th scope="col" className={HEAD}>
            제목
          </th>
          <th scope="col" className={`${HEAD} w-[9rem]`}>
            {showIdentifier ? "식별자" : "태그"}
          </th>
          <th scope="col" className={`${HEAD} w-[4rem]`}>
            읽힘
          </th>
          {reserveViews ? (
            <th scope="col" className={`${HEAD} w-[4.5rem] pr-3 text-right`}>
              조회
            </th>
          ) : null}
        </tr>
      </thead>

      <tbody>
        {posts.map((post) => {
          const { frontmatter } = post;
          const category = getCategory(post.category);
          const identifier = identifierOf(post, showIdentifier);
          // 조회수 저장소의 post_id 는 글 상세 URL 과 같은 `{category}/{slug}` 다 (services/turso.ts).
          const postId = `${post.category}/${post.slug}`;

          return (
            <tr
              key={postId}
              // 위·아래 모두 선을 준다. 아래만 주면 collapse 된 머리글 경계가
              // 첫 행에만 0.5px 로 걸려 행 높이가 갈린다 (실측).
              className={`border-y border-l-2 border-y-border transition-colors hover:bg-surface ${
                category ? ACCENT_RULE[category.accent] : "border-l-border"
              }`}
            >
              <td className={`hidden pl-3 md:table-cell ${CELL}`}>
                <time dateTime={frontmatter.publishedAt} className={META}>
                  {formatDateShort(frontmatter.publishedAt)}
                </time>
              </td>

              {showCategory ? (
                <td className={`hidden md:table-cell ${CELL}`}>
                  {/* 색만으로 알리지 않는다 — 짧은 이름을 텍스트로 함께 둔다. */}
                  <span
                    className={`text-xs ${
                      category ? ACCENT_TEXT[category.accent] : "text-muted"
                    }`}
                  >
                    {category?.shortName}
                  </span>
                </td>
              ) : null}

              <td className="py-3 pr-4 pl-3 align-middle md:py-2.5 md:pl-0">
                <Link
                  href={`/${post.category}/${post.slug}`}
                  className="block truncate text-[0.9375rem] text-heading underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {frontmatter.title}
                </Link>

                {/* 접힌 열은 이 한 줄로 대신한다. 넘치면 가로로 미는 대신 잘라낸다. */}
                <div
                  className={`mt-1 flex items-center gap-x-2 overflow-hidden md:hidden ${META}`}
                >
                  <time dateTime={frontmatter.publishedAt}>
                    {formatDateShort(frontmatter.publishedAt)}
                  </time>
                  {showCategory && category ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className={ACCENT_TEXT[category.accent]}>
                        {category.shortName}
                      </span>
                    </>
                  ) : null}
                  {identifier ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{identifier}</span>
                    </>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span>{post.readingMinutes}분</span>
                </div>
              </td>

              <td className={`hidden md:table-cell ${CELL}`}>
                <span className={`block truncate ${META}`}>{identifier}</span>
              </td>

              <td className={`hidden md:table-cell ${CELL} ${META}`}>
                {post.readingMinutes}분
              </td>

              {reserveViews ? (
                /* 조회수는 런타임 값이라 서버에서 읽지 않는다 — 감싸는 <ViewCounts> 가 채운다.
                   열 폭은 머리글이 잡아 두므로(table-fixed) 값이 늦게 들어와도 표가 흔들리지 않고,
                   못 받으면 이 칸만 빈 채로 남는다. */
                <td
                  className={`hidden py-2.5 pr-3 text-right align-middle md:table-cell ${META}`}
                >
                  <ViewCell postId={postId} />
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
