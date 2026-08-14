/**
 * getAllPosts() 에서 파생되는 통계 — 태그 색인·아카이브가 쓴다.
 * 전부 파일에서 계산되므로 빌드 타임에 끝난다. 네트워크도 DB 도 타지 않는다.
 * 초안 제외는 로더(getAllPosts)가 NODE_ENV 로 이미 처리한다 — 여기서 다시 거르지 마라.
 */
import { AXES, type AxisSlug } from "@/lib/axes";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { getAllPosts, getAllTags } from "@/lib/content/posts";
import type { Post } from "@/types/content";

export interface CategoryCount {
  slug: CategorySlug;
  count: number;
}

export interface AxisCount {
  slug: AxisSlug;
  count: number;
}

export interface MonthGroup {
  /** KST 기준 `YYYY-MM` */
  ym: string;
  count: number;
  posts: Post[];
}

/** 카테고리별 글 수. 글이 없는 카테고리도 0 으로 남는다 — 분포에서 자리가 사라지면 안 된다. */
export function countByCategory(): CategoryCount[] {
  const posts = getAllPosts();

  return CATEGORIES.map((category) => ({
    slug: category.slug,
    count: posts.filter((post) => post.category === category.slug).length,
  }));
}

/**
 * 축별 글 수. 6축을 order 순서 그대로, **0편인 축도 빼지 않고** 준다.
 * axis 가 필수·단일이므로 이 합은 전체 글 수와 같다 — 그래야 /topics 가 지도 노릇을 한다.
 * 빈 축은 감출 것이 아니라 무엇을 더 실어야 하는지 알려 주는 정보다.
 */
export function countByAxis(): AxisCount[] {
  const posts = getAllPosts();

  return AXES.map((axis) => ({
    slug: axis.slug,
    count: posts.filter((post) => post.frontmatter.axis === axis.slug).length,
  }));
}

/**
 * 발행 월 묶음. 최신 월이 앞이고, 월 안의 순서는 getAllPosts() 의 최신순을 그대로 잇는다.
 *
 * publishedAt 은 스키마가 `+0900` 으로 고정하므로 앞 7자가 곧 KST 의 YYYY-MM 이다
 * (CLAUDE.md CRITICAL). Date 로 되파싱하면 빌드 머신의 타임존이 끼어들어 월이 어긋난다.
 */
export function postsByMonth(): MonthGroup[] {
  const months = new Map<string, Post[]>();

  for (const post of getAllPosts()) {
    const ym = post.frontmatter.publishedAt.slice(0, 7);
    const bucket = months.get(ym);

    if (bucket) {
      bucket.push(post);
    } else {
      months.set(ym, [post]);
    }
  }

  return (
    [...months.entries()]
      // 넣는 순서가 이미 최신순이지만 그 사실에 기대지 않는다. YYYY-MM 은 자릿수가 고정이라
      // 문자열 비교로 충분하다 (로케일에 좌우되는 비교를 쓸 이유가 없다).
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .map(([ym, posts]) => ({ ym, count: posts.length, posts }))
  );
}

/**
 * 태그 색인. 집계는 getAllTags() 가 하고 여기서는 순서만 확정한다 —
 * 태그를 세는 곳이 둘이 되면 색인과 필터의 숫자가 갈린다.
 *
 * 빈도 내림차순, 동률은 태그 이름순. 이름 비교는 코드포인트로 한다:
 * localeCompare 는 실행 환경의 ICU 에 따라 결과가 달라질 수 있고, 한글 완성형은
 * 코드포인트 순서가 곧 가나다순이다.
 */
export function tagIndex(): { tag: string; count: number }[] {
  return [...getAllTags()].sort(
    (a, b) =>
      b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0),
  );
}
