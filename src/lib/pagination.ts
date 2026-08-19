/**
 * 목록 URL·필터·페이지네이션 로직. UI 에서 떼어내 테스트 가능하게 둔다.
 * 카테고리 목록과 검색 결과가 같은 규칙을 쓴다.
 *
 * 글 주소를 만드는 곳도 여기다. `content/posts.ts` 에 두지 않는 이유는 그쪽이
 * `node:fs` 를 import 해서 클라이언트 컴포넌트로 못 끌어오기 때문이다.
 */

/**
 * 글 하나의 주소. **분류를 담지 않는다.**
 *
 * 옛 주소는 `/{category}/{slug}` 였다. 분류를 주소에 넣으면 분류를 고칠 때마다 링크가 죽는데,
 * 이 사이트는 그 개편을 이미 한 번 겪었다 — 2026-08-15 에 `hf-blog` 한 칸이
 * `releases` 와 `news` 로 갈렸다. 게다가 62%가 `papers` 라 주소의 대부분이
 * 「이 글이 무엇인가」가 아니라 「어느 피드에서 왔나」를 말하고 있었다.
 *
 * 덤으로 결함 하나가 사라졌다 — 최상위 동적 세그먼트(`/{category}`)가 없어지면서
 * 정적 라우트와 충돌할 자리 자체가 없어졌다 (옛 `RESERVED_SEGMENTS`).
 *
 * **slug 은 이제 바꿀 수 없다.** 대신 카테고리도 축도 언제든 고칠 수 있다.
 */
export function postHref(slug: string): string {
  return `/posts/${slug}`;
}

/**
 * 한 쪽에 싣는 글 수. **10 은 손으로 쓰던 블로그의 숫자다** —
 * 하루 스무 편이 들어오는 지면에서는 하루치를 보는 데만 세 번을 넘겨야 한다.
 */
export const PAGE_SIZE = 25;

export function filterByTag<T extends { tags: string[] }>(
  items: T[],
  tag?: string,
): T[] {
  if (!tag) {
    return items;
  }
  return items.filter((item) => item.tags.includes(tag));
}

/**
 * 주제 축 필터. 글마다 하나뿐이라 일치다 (태그와 달리 포함이 아니다).
 * `useSearchParams().get()` 이 null 을 주므로 null 도 「필터 없음」으로 받는다.
 */
export function filterByAxis<T extends { axis?: string }>(
  items: T[],
  axis?: string | null,
): T[] {
  if (!axis) {
    return items;
  }
  return items.filter((item) => item.axis === axis);
}

/** 출처(카테고리) 필터. 축과 같은 규칙이다 — 글마다 하나뿐이라 일치다. */
export function filterBySource<T extends { category?: string }>(
  items: T[],
  source?: string | null,
): T[] {
  if (!source) {
    return items;
  }
  return items.filter((item) => item.category === source);
}

export interface ListFilters {
  axis?: string | null;
  source?: string | null;
  tag?: string | null;
}

/**
 * 셋을 **함께** 건다. 지금까지는 한 번에 하나씩만 걸렸다 —
 * 「6개월 전에 본 그 서빙 쪽 논문」을 찾으려면 축과 출처를 같이 걸어야 한다.
 *
 * 순서는 좁은 것부터다. 결과는 같지만 뒤의 필터가 훑을 배열이 작아진다.
 */
export function applyFilters<
  T extends { axis?: string; category?: string; tags: string[] },
>(items: T[], { axis, source, tag }: ListFilters): T[] {
  return filterByTag(
    filterBySource(filterByAxis(items, axis), source),
    tag ?? undefined,
  );
}

export function paginate<T>(
  items: T[],
  page: number,
): { items: T[]; totalPages: number; isOutOfRange: boolean } {
  // 글이 없어도 1페이지는 존재한다 — totalPages 0 은 "0 / 0" 같은 표기를 만든다.
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const isOutOfRange =
    !Number.isInteger(page) || page < 1 || page > totalPages;

  // 범위 밖은 조용히 1페이지로 되돌리지 않는다. 깨진 링크를 사용자가 알아야 한다.
  if (isOutOfRange) {
    return { items: [], totalPages, isOutOfRange: true };
  }

  const start = (page - 1) * PAGE_SIZE;
  return {
    items: items.slice(start, start + PAGE_SIZE),
    totalPages,
    isOutOfRange: false,
  };
}

/** `listHref` 가 관리하는 쿼리 키. **여기 없는 키는 basePath 의 것이 그대로 남는다.** */
const MANAGED = ["axis", "source", "tag", "page"] as const;

/**
 * 목록 링크. 쿼리 규약은 `?axis=&source=&tag=<한글 URL 인코딩>&page=<1부터, 1은 생략>` 다.
 *
 * basePath 에 이미 쿼리가 붙어 있으면(검색 페이지의 `?q=`) 그대로 보존한다 —
 * 페이지를 넘겼더니 검색어가 사라지는 일을 막는다.
 * **넘기지 않은 필터는 basePath 에 있어도 지워진다** — 그래야 필터가 풀린다.
 * page 도 넘겨받은 값만 남는다 (호출부가 생략하면 1페이지로 리셋).
 *
 * `format` 은 관리 목록에서 빠졌다 — 60편 전부 `explainer` 하나라 필터가 아무것도 거르지
 * 못했다. 필드와 enum 은 그대로다 (「재현 검증·실전 기록은 notes 강제」 규칙이 거기 있다).
 */
export function listHref(
  basePath: string,
  { axis, source, tag, page }: ListFilters & { page?: number },
): string {
  const [path, existing] = basePath.split("?");
  const params = new URLSearchParams(existing);

  for (const key of MANAGED) {
    params.delete(key);
  }
  if (axis) {
    params.set("axis", axis);
  }
  if (source) {
    params.set("source", source);
  }
  if (tag) {
    // 한글 태그는 URL 인코딩이 필요하다. URLSearchParams 가 대신 해 준다.
    params.set("tag", tag);
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** 태그 목록. 글 수 내림차순, 같으면 이름 오름차순. */
export function collectTags(
  items: { tags: string[] }[],
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
