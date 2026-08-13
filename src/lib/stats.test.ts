import { describe, expect, it, vi } from "vitest";

import { getAllPosts, getAllTags } from "./content/posts";
import { countByCategory, postsByMonth, tagIndex } from "./stats";

/**
 * posts.test.ts 와 같은 방식으로 실제 `content/` 를 읽는다 — 픽스처를 두지 않는다.
 * 통계는 로더 위에 얹힌 얇은 층이라, 로더가 주는 것과 어긋나는지가 유일한 관심사다.
 */

/** 초안 제외는 NODE_ENV 로만 갈린다. 프로덕션 빌드와 같은 조건으로 재 본다. */
function inProduction<T>(run: () => T): T {
  vi.stubEnv("NODE_ENV", "production");
  try {
    return run();
  } finally {
    vi.unstubAllEnvs();
  }
}

describe("postsByMonth", () => {
  it("최신 월이 앞에 온다", () => {
    const months = inProduction(postsByMonth).map((month) => month.ym);

    expect(months).toEqual(["2026-08", "2026-07", "2026-06"]);
  });

  it("같은 달의 글이 한 묶음으로 들어간다", () => {
    for (const month of inProduction(postsByMonth)) {
      expect(month.posts).toHaveLength(month.count);
      for (const post of month.posts) {
        // publishedAt 은 스키마가 +0900 으로 고정한다 — 앞 7자가 곧 KST 의 YYYY-MM 이다.
        expect(post.frontmatter.publishedAt.slice(0, 7)).toBe(month.ym);
      }
    }

    // 8월 3건 · 7월 3건 · 6월 2건. 어느 달도 쪼개지지 않는다.
    expect(inProduction(postsByMonth).map((month) => month.count)).toEqual([
      3, 3, 2,
    ]);
  });

  it("월 안에서도 최신 글이 먼저다", () => {
    const august = inProduction(postsByMonth)[0];
    const published = august.posts.map((post) => post.frontmatter.publishedAt);

    expect(published).toEqual([...published].sort().reverse());
  });

  it("한 편도 빠뜨리거나 겹쳐 세지 않는다", () => {
    const total = inProduction(postsByMonth).reduce(
      (sum, month) => sum + month.count,
      0,
    );

    expect(total).toBe(inProduction(getAllPosts).length);
  });

  it("초안은 프로덕션 집계에 섞이지 않는다", () => {
    const countOfAugust = (months: { ym: string; count: number }[]) =>
      months.find((month) => month.ym === "2026-08")?.count;

    // 초안 한 편이 2026-08 에 있다. 개발에서만 보인다.
    expect(countOfAugust(postsByMonth())).toBe(4);
    expect(countOfAugust(inProduction(postsByMonth))).toBe(3);
  });
});

describe("tagIndex", () => {
  it("빈도 내림차순으로 준다", () => {
    const counts = inProduction(tagIndex).map((entry) => entry.count);

    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(inProduction(tagIndex)[0]).toEqual({ tag: "LLM", count: 5 });
  });

  it("동률은 태그 이름순으로 고정한다", () => {
    const index = inProduction(tagIndex);
    const at = (tag: string) => index.findIndex((entry) => entry.tag === tag);

    // 둘 다 3편이다. 순서가 실행마다 흔들리면 안 된다.
    expect(index[at("벤치마크")].count).toBe(3);
    expect(index[at("추론")].count).toBe(3);
    expect(at("벤치마크")).toBeLessThan(at("추론"));

    // 빈도 1인 태그는 뒤로 밀리되 사라지지 않는다.
    expect(at("MoE")).toBeGreaterThan(at("추론"));
    expect(index.at(-1)?.count).toBe(1);
  });

  it("집계 자체는 getAllTags() 의 것을 그대로 쓴다", () => {
    const counted = new Map(
      inProduction(getAllTags).map((entry) => [entry.tag, entry.count]),
    );
    const index = inProduction(tagIndex);

    expect(index).toHaveLength(counted.size);
    for (const entry of index) {
      expect(counted.get(entry.tag)).toBe(entry.count);
    }
  });

  it("초안에만 붙은 태그는 프로덕션 색인에서 빠진다", () => {
    const tagsOf = (index: { tag: string }[]) =>
      index.map((entry) => entry.tag);

    expect(tagsOf(tagIndex())).toContain("비용");
    expect(tagsOf(inProduction(tagIndex))).not.toContain("비용");
  });
});

describe("countByCategory", () => {
  it("합계가 전체 글 수와 같다", () => {
    const total = inProduction(countByCategory).reduce(
      (sum, entry) => sum + entry.count,
      0,
    );

    expect(total).toBe(inProduction(getAllPosts).length);
  });

  it("카테고리 3종을 순서 그대로 준다", () => {
    expect(inProduction(countByCategory)).toEqual([
      { slug: "hf-blog", count: 3 },
      { slug: "papers", count: 3 },
      // notes 3건 중 1건이 초안이라 프로덕션에서는 2건이다.
      { slug: "notes", count: 2 },
    ]);
  });

  it("초안은 카테고리 집계에도 섞이지 않는다", () => {
    const notesCount = (entries: { slug: string; count: number }[]) =>
      entries.find((entry) => entry.slug === "notes")?.count;

    expect(notesCount(countByCategory())).toBe(3);
    expect(notesCount(inProduction(countByCategory))).toBe(2);
  });
});
