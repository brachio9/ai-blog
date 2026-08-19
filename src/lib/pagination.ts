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

export const PAGE_SIZE = 10;

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
 * 포맷 필터. `?tag=` 과 같은 규약(`?format=`)을 쓰되 거르는 방식이 다르다 —
 * 태그는 여럿이라 포함이지만 포맷은 글마다 하나뿐이라 일치다.
 * 포맷은 선택 필드라 없는 글은 어떤 포맷 필터에도 걸리지 않는다.
 * useSearchParams().get() 이 null 을 주므로 null 도 "필터 없음"으로 받는다.
 */
export function filterByFormat<T extends { format?: string }>(
  items: T[],
  format?: string | null,
): T[] {
  if (!format) {
    return items;
  }
  return items.filter((item) => item.format === format);
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

/**
 * 목록 링크. 쿼리 규약은 `?tag=<한글 URL 인코딩>&format=<slug>&page=<1부터, 1은 생략>` 다.
 * basePath 에 이미 쿼리가 붙어 있으면(검색 페이지의 `?q=`) 그대로 보존한다 —
 * 페이지를 넘겼더니 검색어가 사라지는 일을 막는다.
 * 넘기지 않은 tag·format 은 basePath 에 있어도 지워진다 (그래야 필터가 풀린다).
 * page 도 넘겨받은 값만 남는다 (호출부가 생략하면 1페이지로 리셋).
 */
export function listHref(
  basePath: string,
  { tag, format, page }: { tag?: string; format?: string; page?: number },
): string {
  const [path, existing] = basePath.split("?");
  const params = new URLSearchParams(existing);

  params.delete("tag");
  params.delete("format");
  params.delete("page");
  if (tag) {
    // 한글 태그는 URL 인코딩이 필요하다. URLSearchParams 가 대신 해 준다.
    params.set("tag", tag);
  }
  if (format) {
    params.set("format", format);
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
