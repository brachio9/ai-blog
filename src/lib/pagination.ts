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
