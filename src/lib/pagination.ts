/**
 * 목록의 태그 필터·페이지네이션 로직. UI 에서 떼어내 테스트 가능하게 둔다.
 * 카테고리 목록과 검색 결과가 같은 규칙을 쓴다.
 */
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
 * 목록 링크. 쿼리 규약은 `?tag=<한글 URL 인코딩>&page=<1부터, 1은 생략>` 다.
 * basePath 에 이미 쿼리가 붙어 있으면(검색 페이지의 `?q=`) 그대로 보존한다 —
 * 페이지를 넘겼더니 검색어가 사라지는 일을 막는다.
 * tag 를 바꾸면 page 는 넘겨받은 값만 남는다 (호출부가 생략하면 1페이지로 리셋).
 */
export function listHref(
  basePath: string,
  { tag, page }: { tag?: string; page?: number },
): string {
  const [path, existing] = basePath.split("?");
  const params = new URLSearchParams(existing);

  params.delete("tag");
  params.delete("page");
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
