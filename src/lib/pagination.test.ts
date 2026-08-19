import { describe, expect, it } from "vitest";

import {
  PAGE_SIZE,
  collectTags,
  applyFilters,
  filterByAxis,
  filterBySource,
  filterByTag,
  listHref,
  paginate,
} from "./pagination";

const items = Array.from({ length: 60 }, (_, index) => index + 1);

describe("paginate", () => {
  it("PAGE_SIZE 단위로 나눈다", () => {
    // 10 은 손으로 쓰던 블로그의 숫자다 — 하루 스무 편이 들어오면 하루치에 세 번을 넘겨야 한다.
    expect(PAGE_SIZE).toBe(25);
    expect(paginate(items, 1).items).toHaveLength(25);
    expect(paginate(items, 1).totalPages).toBe(3);
    expect(paginate(items, 2).items[0]).toBe(26);
  });

  it("마지막 페이지는 잔여분만 준다", () => {
    expect(paginate(items, 3).items).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60]);
  });

  it("딱 떨어지면 빈 페이지를 만들지 않는다", () => {
    const exact = items.slice(0, 50);
    expect(paginate(exact, 2).totalPages).toBe(2);
    expect(paginate(exact, 2).items).toHaveLength(25);
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

interface Row {
  slug: string;
  axis: string;
  category: string;
  tags: string[];
}

const rows: Row[] = [
  { slug: "a", axis: "serving", category: "papers", tags: ["vLLM"] },
  { slug: "b", axis: "serving", category: "releases", tags: ["vLLM", "LoRA"] },
  { slug: "c", axis: "agent", category: "papers", tags: ["MCP"] },
];

describe("filterByAxis · filterBySource", () => {
  it("축·출처는 정확히 같은 글만 남긴다 — 글마다 하나뿐이라 포함이 아니라 일치다", () => {
    expect(filterByAxis(rows, "serving").map((r) => r.slug)).toEqual(["a", "b"]);
    expect(filterBySource(rows, "papers").map((r) => r.slug)).toEqual(["a", "c"]);
  });

  it("값이 없으면 전체를 준다 — null 도 같다 (useSearchParams 가 null 을 준다)", () => {
    for (const empty of [undefined, null, ""]) {
      expect(filterByAxis(rows, empty)).toEqual(rows);
      expect(filterBySource(rows, empty)).toEqual(rows);
    }
  });

  it("모르는 값이면 빈 목록을 준다 — 조용히 전체로 되돌리지 않는다", () => {
    expect(filterByAxis(rows, "없는축")).toEqual([]);
    expect(filterBySource(rows, "없는칸")).toEqual([]);
  });
});

describe("applyFilters", () => {
  it("셋을 함께 건다 — 「그 서빙 쪽 논문」을 찾으려면 둘을 같이 걸어야 한다", () => {
    expect(
      applyFilters(rows, { axis: "serving", source: "papers" }).map((r) => r.slug),
    ).toEqual(["a"]);
    expect(
      applyFilters(rows, { axis: "serving", tag: "LoRA" }).map((r) => r.slug),
    ).toEqual(["b"]);
  });

  it("겹치는 것이 없으면 빈 목록이다", () => {
    expect(applyFilters(rows, { axis: "agent", tag: "vLLM" })).toEqual([]);
  });

  it("아무것도 안 걸면 전체다", () => {
    expect(applyFilters(rows, {})).toEqual(rows);
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

describe("listHref", () => {
  it("파라미터가 없으면 basePath 그대로다", () => {
    expect(listHref("/papers", {})).toBe("/papers");
  });

  it("1페이지는 생략하고 그 뒤만 page 를 붙인다", () => {
    expect(listHref("/papers", { page: 1 })).toBe("/papers");
    expect(listHref("/papers", { page: 3 })).toBe("/papers?page=3");
  });

  it("한글 태그를 URL 인코딩한다", () => {
    expect(listHref("/papers", { tag: "추론", page: 2 })).toBe(
      `/papers?tag=${encodeURIComponent("추론")}&page=2`,
    );
  });

  it("basePath 에 이미 붙은 쿼리를 보존한다 — 검색어가 페이지 이동에서 사라지면 안 된다", () => {
    const base = `/search?q=${encodeURIComponent("추론")}`;

    expect(listHref(base, {})).toBe(base);
    expect(listHref(base, { tag: "LLM", page: 2 })).toBe(
      `${base}&tag=LLM&page=2`,
    );
  });

  it("basePath 의 tag·page 는 인자로 덮어쓴다", () => {
    expect(listHref("/papers?tag=LLM&page=5", { tag: "추론" })).toBe(
      `/papers?tag=${encodeURIComponent("추론")}`,
    );
    expect(listHref("/papers?tag=LLM&page=5", {})).toBe("/papers");
  });

  it("축·출처를 태그와 같은 규약으로 싣는다", () => {
    expect(listHref("/search", { axis: "serving" })).toBe("/search?axis=serving");
    expect(
      listHref("/search", { axis: "serving", source: "papers", tag: "LoRA", page: 2 }),
    ).toBe("/search?axis=serving&source=papers&tag=LoRA&page=2");
  });

  it("넘기지 않은 필터는 basePath 에 있어도 지워진다 — 남겨 두면 안 풀린다", () => {
    expect(listHref("/search?axis=agent", { axis: "serving" })).toBe(
      "/search?axis=serving",
    );
    expect(listHref("/search?axis=agent&source=papers&tag=MCP", {})).toBe("/search");
  });

  it("관리하지 않는 쿼리는 지킨다 — 페이지를 넘겼더니 검색어가 사라지면 안 된다", () => {
    expect(listHref("/search?q=추론", { axis: "serving" })).toBe(
      `/search?q=${encodeURIComponent("추론")}&axis=serving`,
    );
  });
});
