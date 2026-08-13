import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ACCENT_TEXT, PostTable } from "@/components/post/PostTable";
import { PopularPosts, ViewCounts } from "@/components/post/ViewCounts";
import {
  CATEGORIES,
  categoryHref,
  getCategory,
  type CategorySlug,
} from "@/lib/categories";
import { getAllPosts, getPostsByCategory } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { countByCategory } from "@/lib/stats";
import type { Post } from "@/types/content";

/** 홈의 주력 구역. 화면을 넘기지 않을 만큼만 싣고 나머지는 카테고리 페이지가 받는다. */
const LATEST_COUNT = 6;
const PAPER_COUNT = 3;
const DIGEST_COUNT = 4;

/** arXiv ID 는 논문 전용 메타라 이 카테고리만 열 구성이 다르다. */
const PAPER_SLUG: CategorySlug = "papers";

const NAV_LINK =
  "text-sm text-muted transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-focus";

/** 조회수 저장소의 post_id — 글 상세 URL 과 같다 (services/turso.ts). */
function postId(post: Post): string {
  return `${post.category}/${post.slug}`;
}

export default function Home() {
  const allPosts = getAllPosts();
  const latest = allPosts.slice(0, LATEST_COUNT);
  const paperCategory = getCategory(PAPER_SLUG);
  const paperPosts = paperCategory
    ? getPostsByCategory(paperCategory.slug).slice(0, PAPER_COUNT)
    : [];

  // 논문 말고는 한 줄짜리 요약 목록으로 훑는다. 카테고리가 늘면 여기 자동으로 붙는다.
  const digest = CATEGORIES.filter(
    (category) => category.slug !== PAPER_SLUG,
  ).map((category) => ({
    category,
    posts: getPostsByCategory(category.slug).slice(0, DIGEST_COUNT),
  }));

  // 구역마다 몇 편을 잘라 실었는지가 아니라 카테고리에 몇 편이 있는지를 보인다.
  // 홈은 잘린 목록만 들고 있으므로 전체 수는 stats 에서 받는다.
  const counts = new Map(
    countByCategory().map(({ slug, count }) => [slug, count]),
  );

  // 홈에 실린 글 — 구역이 겹치므로 id 로 한 번 접는다. 조회수 조회와 순위가 같은 목록을 쓴다.
  const shown = new Map<string, string>();
  for (const post of [...latest, ...paperPosts, ...digest.flatMap((g) => g.posts)]) {
    shown.set(postId(post), post.frontmatter.title);
  }
  const shownPosts = [...shown].map(([id, title]) => ({ postId: id, title }));

  return (
    <Container>
      {/* 최근 글 표와 순위가 배치 호출 하나를 나눠 쓴다 — 행마다 부르지 않는다. */}
      <ViewCounts ids={shownPosts.map((post) => post.postId)}>
        <div className="pb-16">
          {/* 마스트헤드 — 좌측 정렬. 화면 높이의 1/4 을 넘기지 않아야 첫 글이 접힘선 위에 온다. */}
          <header className="border-b border-border py-8 md:py-10">
            <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
              {SITE_NAME}
            </h1>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-[1.7] text-body">
              HuggingFace 블로그와 arXiv 논문을 읽고 한글로 추려 적습니다. 논문
              맨 앞의 초록(抄錄)이 그렇듯 전문 번역이 아니라 요점만 남긴
              요약이고, 원문 링크는 모든 글에 답니다.
            </p>
          </header>

          {/* 1) 최신 — 카테고리를 섞은 한 표. 첫 화면이 이 표에서 시작한다. */}
          <section className="pt-6">
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
                최근 글
              </h2>
              <p className="font-mono text-xs text-muted tabular-nums">
                전체 {allPosts.length}편
              </p>
            </div>
            <PostTable
              posts={latest}
              showCategory
              reserveViews
              caption="최근 글"
            />
          </section>

          {/* 2) 논문 — 같은 표를 쓰되 구분 대신 arXiv 식별자를 보인다. */}
          {paperCategory && paperPosts.length > 0 ? (
            <section className="pt-14">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="text-xl font-semibold text-heading">
                  {paperCategory.name}
                </h2>
                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="font-mono text-xs text-muted tabular-nums">
                    {counts.get(paperCategory.slug) ?? 0}편
                  </span>
                  <Link href={categoryHref(paperCategory)} className={NAV_LINK}>
                    전체 보기
                  </Link>
                </span>
              </div>
              <p className="mt-1 mb-3 max-w-[68ch] text-sm text-muted">
                {paperCategory.description}
              </p>
              <PostTable
                posts={paperPosts}
                showIdentifier
                caption={paperCategory.name}
              />
            </section>
          ) : null}

          {/* 3) 소식·메모 — 표가 아니라 날짜와 제목만 남긴 한 줄 목록. 둘을 나란히 둔다. */}
          <section className="grid gap-x-10 gap-y-8 pt-14 md:grid-cols-2">
            {digest.map(({ category, posts }) => (
              // min-w-0 이 없으면 그리드 칸이 제목 길이만큼 벌어져 페이지가 가로로 밀린다.
              <div key={category.slug} className="min-w-0">
                <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                  <h2
                    className={`text-sm font-semibold tracking-wide uppercase ${ACCENT_TEXT[category.accent]}`}
                  >
                    {category.name}
                  </h2>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <span className="font-mono text-xs text-muted tabular-nums">
                      {counts.get(category.slug) ?? 0}편
                    </span>
                    <Link href={categoryHref(category)} className={NAV_LINK}>
                      전체 보기
                    </Link>
                  </span>
                </div>

                {posts.length > 0 ? (
                  <ul>
                    {posts.map((post) => (
                      <li key={post.filePath}>
                        <Link
                          href={`/${post.category}/${post.slug}`}
                          className="flex items-baseline gap-3 py-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          <time
                            dateTime={post.frontmatter.publishedAt}
                            className="shrink-0 font-mono text-xs text-muted tabular-nums"
                          >
                            {formatDateShort(post.frontmatter.publishedAt)}
                          </time>
                          <span className="min-w-0 truncate text-[0.9375rem] text-heading">
                            {post.frontmatter.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pt-3 text-sm text-muted">
                    아직 올라온 글이 없습니다.
                  </p>
                )}
              </div>
            ))}
          </section>

          {/* 4) 많이 읽힌 글 — 런타임 값이라 조회수를 받은 뒤에야 나타난다.
              페이지 맨 아래에 두어 나중에 붙어도 위의 글 목록이 밀리지 않는다.
              받지 못하면 이 구역은 아예 그려지지 않는다. */}
          <PopularPosts posts={shownPosts} />
        </div>
      </ViewCounts>
    </Container>
  );
}
