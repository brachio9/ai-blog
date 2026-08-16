import { describe, expect, it, vi } from "vitest";

import { AXES } from "./axes";
import { CATEGORIES } from "./categories";
import { getAllPosts, getAllTags } from "./content/posts";
import { countByAxis, countByCategory, postsByMonth, tagIndex } from "./stats";

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

    // 달 이름을 박지 않는다 — 봇이 매일 밤 글을 올리므로 달이 바뀌면 그 자리에서 깨진다.
    expect(months.length).toBeGreaterThan(0);
    expect(months).toEqual([...months].sort().reverse());
    expect(new Set(months).size).toBe(months.length); // 같은 달이 두 번 나오지 않는다
  });

  it("같은 달의 글이 한 묶음으로 들어간다", () => {
    for (const month of inProduction(postsByMonth)) {
      expect(month.posts).toHaveLength(month.count);
      for (const post of month.posts) {
        // publishedAt 은 스키마가 +0900 으로 고정한다 — 앞 7자가 곧 KST 의 YYYY-MM 이다.
        expect(post.frontmatter.publishedAt.slice(0, 7)).toBe(month.ym);
      }
    }

    // 어느 달도 쪼개지지 않는다 — 달별 합이 전체와 같으면 빠뜨린 글도 겹친 글도 없다.
    const months = inProduction(postsByMonth);
    const summed = months.reduce((sum, month) => sum + month.count, 0);

    expect(summed).toBe(inProduction(getAllPosts).length);
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

    // 건수를 박아 두지 않는다 — 봇이 매일 밤 2026-08 에 초안을 더한다.
    // 확인할 것은 **그 차이가 곧 초안 수**라는 것이다.
    const augustDrafts = getAllPosts().filter(
      (post) => post.frontmatter.publishedAt.startsWith("2026-08") && post.frontmatter.draft,
    ).length;

    expect(augustDrafts).toBeGreaterThan(0);
    expect(countOfAugust(postsByMonth())).toBe(
      (countOfAugust(inProduction(postsByMonth)) ?? 0) + augustDrafts,
    );
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

  it("카테고리 5종을 순서 그대로 준다", () => {
    const counted = inProduction(countByCategory);

    // **0편인 카테고리도 빠지지 않는다** — 감추지 않는 것이 정보다.
    // 개수는 박지 않는다. 봇이 채우는 칸이라 매일 달라진다.
    // 0편이라 빠졌다면 이 목록이 짧아진다 — 그것이 곧 이 단언의 값어치다.
    expect(counted.map((entry) => entry.slug)).toEqual(
      CATEGORIES.map((category) => category.slug),
    );
  });

  it("초안은 카테고리 집계에도 섞이지 않는다", () => {
    const notesCount = (entries: { slug: string; count: number }[]) =>
      entries.find((entry) => entry.slug === "notes")?.count;

    expect(notesCount(countByCategory())).toBe(3);
    expect(notesCount(inProduction(countByCategory))).toBe(2);
  });
});

describe("countByAxis", () => {
  it("합계가 전체 글 수와 같다 — 축은 필수·단일이라 한 편도 새지 않는다", () => {
    const total = inProduction(countByAxis).reduce(
      (sum, entry) => sum + entry.count,
      0,
    );

    expect(total).toBe(inProduction(getAllPosts).length);
  });

  it("0편인 축도 빠뜨리지 않는다 — 빈 축이 사라지면 /topics 가 지도 노릇을 못 한다", () => {
    const counted = inProduction(countByAxis);

    // 6축 전부, order 순서 그대로. 0편인 축이 빠지면 이 목록이 짧아진다.
    // 개수는 박지 않는다 — 봇이 매일 밤 축을 채우므로 그 숫자는 매일 달라진다.
    expect(counted.map((entry) => entry.slug)).toEqual(
      AXES.map((axis) => axis.slug),
    );
  });

  it("초안은 축 집계에도 섞이지 않는다", () => {
    // 어느 축이 초안을 갖는지도 박지 않는다 — 축마다 「개발에서 센 것 − 프로덕션에서
    // 센 것」이 곧 그 축의 초안 수여야 한다. 이것이 성립하면 초안은 한 축에서도 새지 않는다.
    const dev = countByAxis();
    const production = inProduction(countByAxis);
    const drafts = getAllPosts().filter((post) => post.frontmatter.draft);

    expect(drafts.length).toBeGreaterThan(0);
    for (const [index, entry] of dev.entries()) {
      const draftsHere = drafts.filter(
        (post) => post.frontmatter.axis === entry.slug,
      ).length;

      expect(entry.count - production[index].count).toBe(draftsHere);
    }
  });
});
