import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PostBrief } from "@/components/post/PostBrief";
import { PostLead, splitSummary } from "@/components/post/PostLead";
import { ACCENT_TEXT } from "@/components/post/PostTable";
import { PopularPosts, ViewCounts } from "@/components/post/ViewCounts";
import { AXES, axisHref, axisNumber } from "@/lib/axes";
import { CATEGORIES, categoryHref } from "@/lib/categories";
import { getAllPosts, getPostsByCategory } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { pickLead } from "@/lib/frontpage";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { countByAxis, countByCategory } from "@/lib/stats";
import { postHref } from "@/lib/pagination";
import type { Post } from "@/types/content";

/**
 * 1면에 싣는 단신 수. 머리기사 하나와 이 다섯이 **첫 화면 안에서** 끝나야 한다 —
 * 단골이 10초 안에 "오늘 새 글"을 못 고르면 시그니처가 무의미하다 (design/brief.md 실패 신호).
 */
const BRIEF_COUNT = 5;

/** 1면 아래의 급 낮은 구역. 화면을 넘기지 않을 만큼만 싣고 나머지는 카테고리 페이지가 받는다. */
const DIGEST_COUNT = 4;

const NAV_LINK =
  "text-sm text-muted transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-focus";

/** 조회수 저장소의 post_id — 글 상세 URL 과 같다 (services/turso.ts). */
function postId(post: Post): string {
  return post.slug;
}

export default function Home() {
  const allPosts = getAllPosts();
  // 목록이 최신순이라 첫 항목이 곧 이 지면의 최근 발행일이다.
  const newest = allPosts.at(0);

  // 오늘의 편집 — 머리기사 하나를 고르고 나머지 최근 글을 단신으로 뭉친다.
  // 같은 글이 1면에 두 번 실리지 않도록 머리기사는 단신에서 뺀다.
  const lead = pickLead(allPosts);
  const briefs = allPosts
    .filter((post) => post !== lead)
    .slice(0, BRIEF_COUNT);

  // 1면 아래는 카테고리별 최신 몇 줄. 카테고리가 늘면 여기 자동으로 붙는다.
  const digest = CATEGORIES.map((category) => ({
    category,
    posts: getPostsByCategory(category.slug).slice(0, DIGEST_COUNT),
  }));

  // 구역마다 몇 편을 잘라 실었는지가 아니라 카테고리에 몇 편이 있는지를 보인다.
  // 홈은 잘린 목록만 들고 있으므로 전체 수는 stats 에서 받는다.
  const counts = new Map(
    countByCategory().map(({ slug, count }) => [slug, count]),
  );

  // 여섯 갈래 안내판. 편수 0인 축도 자리를 지킨다 — 빈 축은 감출 것이 아니라
  // 무엇을 더 실어야 하는지 알리는 정보다 (/topics 와 같은 규약).
  // 축의 약속은 첫 문장이면 충분하다. 전문은 /topics 가 싣는다.
  const axisCounts = new Map(
    countByAxis().map(({ slug, count }) => [slug, count]),
  );
  const axes = AXES.map((axis) => ({
    axis,
    count: axisCounts.get(axis.slug) ?? 0,
    blurb: splitSummary(axis.description).deck,
  }));

  // 홈에 실린 글 — 구역이 겹치므로 id 로 한 번 접는다. 조회수 조회와 순위가 같은 목록을 쓴다.
  const shown = new Map<string, string>();
  for (const post of [
    ...(lead ? [lead] : []),
    ...briefs,
    ...digest.flatMap((g) => g.posts),
  ]) {
    shown.set(postId(post), post.frontmatter.title);
  }
  const shownPosts = [...shown].map(([id, title]) => ({ postId: id, title }));

  return (
    <Container>
      {/* 최근 글 표와 순위가 배치 호출 하나를 나눠 쓴다 — 행마다 부르지 않는다. */}
      <ViewCounts ids={shownPosts.map((post) => post.postId)}>
        <div className="pb-16">
          {/* 제호 — 좌측 정렬. 히어로가 아니므로 화면을 차지하지 않고, 곧바로 목록이 온다.
              이름과 설명은 src/lib/site.ts 가 유일한 출처다. */}
          <header className="masthead border-b border-border">
            <h1 className="masthead-title text-heading">{SITE_NAME}</h1>
            <p className="masthead-line">{SITE_DESCRIPTION}</p>

            {/* 발행 정보 — 수치는 mono, 한글은 산세리프. 두 목소리를 섞지 않는다. */}
            <div className="masthead-meta">
              <span className="voice-ui text-muted">
                전체 <span className="voice-source">{allPosts.length}</span>편
              </span>
              {newest ? (
                <span className="voice-ui text-muted">
                  최근 발행{" "}
                  <span className="voice-source">
                    {formatDateShort(newest.frontmatter.publishedAt)}
                  </span>
                </span>
              ) : null}
            </div>
          </header>

          {/* 1) 머리기사 — 지면당 하나. 표제가 스케일 밖(clamp 30~54px)으로 커지는 자리이고,
              이 지면의 파격 예산은 여기에 전부 쓴다. 누구를 싣는지는 pickLead 가 정한다:
              frontmatter 의 lead, 없으면 최신 글. 조회수로 고르지 않는다 — 편할 뿐 편집이 아니다. */}
          {lead ? <PostLead post={lead} /> : null}

          {/* 2) 단신 묶음 — 머리기사를 뺀 최근 글. 짧은 것은 늘어놓지 않고 뭉친다.
              머리기사와 급이 3배 가까이 벌어지는 것이 이 배치의 전부다.
              눈에 보이는 머리글을 두지 않는다 (design/components/signatures.html 후보 02) —
              이름은 목록 자체에 붙인다. 항목이 grid 라 목록 의미가 떨어질 수 있어 role 로 되돌린다. */}
          {briefs.length > 0 ? (
            <ul
              role="list"
              aria-label="최근 글"
              className="brief-set mt-[var(--space-4)]"
            >
              {briefs.map((post) => (
                <PostBrief key={post.filePath} post={post} />
              ))}
            </ul>
          ) : null}

          {/* 3) 카테고리별 최신 — 1면을 지나면 급이 한 단계 내려간다. 날짜와 제목만 남긴
              한 줄 목록이고 제목도 단신보다 크지 않다. 논문만 따로 크게 싣던 구역을 여기 합쳤다 —
              단신 바로 아래에서 제목이 다시 커지면 급이 거꾸로 서서 1면이 무너진다.
              arXiv 식별자는 머리기사의 데이트라인과 카테고리 페이지가 계속 보인다.
              칸이 다섯이라 한 열로 세우면 여기서만 화면이 한 번 더 넘어간다 — 640px 부터 둘,
              768px 부터 셋으로 흘린다. 마지막 줄이 3+2 로 남는 것은 메우지 않는다:
              오른쪽 여백을 채우지 않는 것이 이 지면의 규약이다. */}
          <section className="grid gap-x-10 gap-y-8 pt-14 sm:grid-cols-2 md:grid-cols-3">
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
                          href={postHref(post.slug)}
                          className="flex items-baseline gap-3 py-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          <time
                            dateTime={post.frontmatter.publishedAt}
                            className="shrink-0 font-mono text-xs text-muted tabular-nums"
                          >
                            {formatDateShort(post.frontmatter.publishedAt)}
                          </time>
                          {/* 세 열이 되면서 제목이 잘리기 시작했다 — 자르는 대신 접는다.
                              행 높이가 들쭉날쭉해지지만 그게 낫다. 잘린 제목은 되찾기를 막고,
                              같은 높이로 맞춘 행은 무엇이 더 중요한지 안 정했다는 뜻이다. */}
                          <span className="min-w-0 text-[0.9375rem] leading-[var(--leading-tight)] text-heading">
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

          {/* 4) 여섯 갈래 — 목록이 아니라 이 매체의 지도다. 그래서 글 제목을 싣지 않는다:
              단신 아래에서 제목이 다시 커지면 급이 거꾸로 서서 1면이 무너진다.
              바로 위 카테고리 구역과 그리드를 달리 잡는다 — 하는 일이 다른 두 구역이
              같아 보이면 안 된다 (안내판 vs 목록).
              축의 부호는 번호(mono)다. 안료 3색은 카테고리 전용이라 여기는 무채로 둔다. */}
          <section aria-labelledby="axes-heading" className="pt-14">
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
              <h2 id="axes-heading" className="kicker">
                여섯 갈래
              </h2>
              <Link href="/topics" className={NAV_LINK}>
                주제 색인
              </Link>
            </div>

            {/* 항목이 grid 라 목록 의미가 떨어질 수 있어 role 로 되돌린다. */}
            <ul
              role="list"
              className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3"
            >
              {axes.map(({ axis, count, blurb }) => (
                <li key={axis.slug} className="border-b border-border">
                  <Link
                    href={axisHref(axis)}
                    className="flex items-baseline gap-3 py-3 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <span className="voice-source shrink-0">
                      {axisNumber(axis)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="text-[length:var(--text-h5)] leading-[var(--leading-tight)] text-heading">
                          {axis.name}
                        </span>
                        {/* 수치는 mono, 단위는 한글 서체 — mono 자리에 한글을 섞지 않는다. */}
                        <span className="voice-ui text-muted">
                          <span className="voice-source">{count}</span>편
                        </span>
                      </span>
                      <span className="mt-[var(--space-1)] block text-[length:var(--text-small)] leading-[var(--leading-tight)] text-muted">
                        {blurb}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* 5) 많이 읽힌 글 — 런타임 값이라 조회수를 받은 뒤에야 나타난다.
              페이지 맨 아래에 두어 나중에 붙어도 위의 글 목록이 밀리지 않는다.
              받지 못하면 이 구역은 아예 그려지지 않는다. */}
          <PopularPosts posts={shownPosts} />
        </div>
      </ViewCounts>
    </Container>
  );
}
