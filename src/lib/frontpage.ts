/**
 * 시그니처 「1면 편집」 (design/brief.md) 의 선정부.
 * 홈이 매번 같은 배치가 아니게 만드는 손잡이는 frontmatter 의 `lead` 하나뿐이다.
 */
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
 * 1면 머리기사를 고른다. **지면당 하나** — 둘이 되는 순간 편집이 아니라 나열이다.
 *
 * frontmatter 의 `lead` 가 true 인 글이 있으면 그중 가장 최근 것, 없으면 전체에서 가장 최근 글.
 * 항상 정확히 하나를 돌려준다 (글이 0편이면 null).
 *
 * 손 안 대면 최신 글이 저절로 머리기사가 된다 — 1인 운영에서 매번 편집 결정을 요구하는
 * 장치는 반드시 흐지부지된다. 조회수는 보지 않는다: 편할 뿐 편집이 아니다.
 * 초안 제외는 로더(getAllPosts)가 이미 했다고 보고 여기서 다시 거르지 않는다.
 */
export function pickLead(posts: Post[]): Post | null {
  const marked = posts.filter((post) => post.frontmatter.lead);
  const pool = marked.length > 0 ? marked : posts;

  // 넘겨받은 순서에 기대지 않는다 — 호출부가 정렬을 바꾸면 조용히 틀리는 쪽이 더 나쁘다.
  return pool.reduce<Post | null>(
    (best, post) => (best === null || comesFirst(post, best) ? post : best),
    null,
  );
}
