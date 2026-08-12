import { describe, expect, it } from "vitest";

import { PAGE_SIZE, collectTags, filterByTag, paginate } from "./pagination";

const items = Array.from({ length: 25 }, (_, index) => index + 1);

describe("paginate", () => {
  it("PAGE_SIZE 단위로 나눈다", () => {
    expect(PAGE_SIZE).toBe(10);
    expect(paginate(items, 1)).toEqual({
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      totalPages: 3,
      isOutOfRange: false,
    });
    expect(paginate(items, 2).items).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it("마지막 페이지는 잔여분만 준다", () => {
    expect(paginate(items, 3).items).toEqual([21, 22, 23, 24, 25]);
  });

  it("딱 떨어지면 빈 페이지를 만들지 않는다", () => {
    const exact = items.slice(0, 20);
    expect(paginate(exact, 2).totalPages).toBe(2);
    expect(paginate(exact, 2).items).toHaveLength(10);
  });

  it("범위 밖 페이지는 isOutOfRange 로 알린다", () => {
    for (const page of [0, -1, 4, 1.5, Number.NaN]) {
      const result = paginate(items, page);
      expect(result.isOutOfRange).toBe(true);
      expect(result.items).toEqual([]);
    }
  });

  it("빈 목록도 1페이지는 존재한다 (0 으로 나누지 않는다)", () => {
    const result = paginate([], 1);
    expect(result.totalPages).toBe(1);
    expect(result.isOutOfRange).toBe(false);
    expect(result.items).toEqual([]);
  });
});

const posts = [
  { slug: "a", tags: ["추론", "벤치마크"] },
  { slug: "b", tags: ["추론"] },
  { slug: "c", tags: [] },
];

describe("filterByTag", () => {
  it("태그를 포함하는 글만 남긴다", () => {
    expect(filterByTag(posts, "추론").map((post) => post.slug)).toEqual([
      "a",
      "b",
    ]);
    expect(filterByTag(posts, "벤치마크").map((post) => post.slug)).toEqual([
      "a",
    ]);
  });

  it("태그가 없으면 전체를 준다", () => {
    expect(filterByTag(posts, undefined)).toEqual(posts);
    expect(filterByTag(posts, "")).toEqual(posts);
  });

  it("없는 태그면 빈 목록을 준다", () => {
    expect(filterByTag(posts, "없는태그")).toEqual([]);
  });
});

describe("collectTags", () => {
  it("개수를 세고 개수 내림차순·이름 오름차순으로 정렬한다", () => {
    expect(
      collectTags([
        { tags: ["추론", "벤치마크"] },
        { tags: ["추론", "양자화"] },
        { tags: ["추론"] },
        { tags: ["양자화"] },
      ]),
    ).toEqual([
      { tag: "추론", count: 3 },
      { tag: "양자화", count: 2 },
      { tag: "벤치마크", count: 1 },
    ]);
  });

  it("빈 목록이면 빈 배열을 준다", () => {
    expect(collectTags([])).toEqual([]);
  });
});
