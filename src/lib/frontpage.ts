/**
 * 시그니처 「1면 편집」 (design/brief.md) 의 선정부.
 * 홈이 매번 같은 배치가 아니게 만드는 손잡이는 frontmatter 의 `lead` 하나뿐이다.
 */
import { showsCrossSources } from "@/lib/selection";
import type { Post } from "@/types/content";

/**
 * 지면에서 앞에 서는 쪽. 최신순, 발행 시각이 같으면 slug 오름차순 —
 * 목록 정렬(src/lib/content/posts.ts)과 같은 기준이라 머리기사가 목록 첫 글과 어긋나지 않는다.
 * publishedAt 은 스키마가 `+0900` 으로 고정하므로 문자열 비교로 충분하다.
 */
function comesFirst(post: Post, best: Post): boolean {
  const byDate = post.frontmatter.publishedAt.localeCompare(
    best.frontmatter.publishedAt,
  );

  return byDate !== 0 ? byDate > 0 : post.slug.localeCompare(best.slug) < 0;
}

/**
 * 머리기사를 고른다. **한 호(號)에 하나** — 둘이 되는 순간 편집이 아니라 나열이다.
 * 이 사이트에서 한 호는 **하루**라, 호출부는 하루치를 넘긴다 (`stats.postsByDay`).
 *
 * 고르는 순서는 셋이다:
 *
 * 1. frontmatter 의 `lead` — 사람이 손으로 정한 것. 언제나 이긴다
 * 2. **여러 곳에서 같이 나온 글** 중 가장 최근 것 (2026-08-19 에 들어왔다)
 * 3. 그것도 없으면 가장 최근 글
 *
 * 2단이 왜 필요했나: `lead` 는 60편 전부 `false` 였다. 봇은 그 칸을 쓰지 않고 사람은 손대지
 * 않으므로 실제로 도는 것은 3단뿐이었는데, 하루치 안에서 「가장 최근」은 **동어반복**이다 —
 * 목록 맨 위 글을 크게 그린 것일 뿐 아무것도 고르지 않았다.
 *
 * **왜 선별 등급이 아니라 교차등장인가.** 등급으로 먼저 짜 봤다가 되돌렸다 — 발행분의 59%가
 * `high` 라 후보를 거의 못 좁힌다. 교차등장은 실측 60편에서 1곳 43 · 2곳 8 · 3곳 6 · 4곳 2 로
 * **27%만 2곳 이상**이라 실제로 가른다. 뜻도 분명하다: 「오늘 여러 곳이 같이 물어 온 소식」.
 *
 * 그 안에서 순서는 여전히 시간이 정한다 — 교차등장은 후보를 좁힐 뿐 순위가 아니다.
 * 조회수는 보지 않는다: 편할 뿐 편집이 아니다.
 * 초안 제외는 로더(getAllPosts)가 이미 했다고 보고 여기서 다시 거르지 않는다.
 */
export function pickLead(posts: Post[]): Post | null {
  const marked = posts.filter((post) => post.frontmatter.lead);
  const crossed = posts.filter((post) =>
    showsCrossSources(post.frontmatter.selection),
  );
  const pool =
    marked.length > 0 ? marked : crossed.length > 0 ? crossed : posts;

  // 넘겨받은 순서에 기대지 않는다 — 호출부가 정렬을 바꾸면 조용히 틀리는 쪽이 더 나쁘다.
  return pool.reduce<Post | null>(
    (best, post) => (best === null || comesFirst(post, best) ? post : best),
    null,
  );
}
