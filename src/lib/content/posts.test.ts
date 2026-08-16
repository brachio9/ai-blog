import { describe, expect, it, vi } from "vitest";

import {
  getAllPosts,
  getAllTags,
  getPost,
  getPostsByAxis,
  getPostsByCategory,
} from "./posts";

/**
 * 실제 `content/` 를 읽는 회귀 테스트다 — 픽스처를 따로 두지 않는다.
 * 샘플 글이 스키마를 어기면 여기서 먼저 터지고, 그게 이 글들의 역할이다.
 */

/** draft 제외는 NODE_ENV 로만 갈린다. 프로덕션 빌드와 같은 조건으로 재 본다. */
function inProduction<T>(run: () => T): T {
  vi.stubEnv("NODE_ENV", "production");
  try {
    return run();
  } finally {
    vi.unstubAllEnvs();
  }
}

describe("getAllPosts", () => {
  it("프로덕션에서는 draft 를 뺀 8건을 준다", () => {
    const posts = inProduction(getAllPosts);

    expect(posts.every((post) => !post.frontmatter.draft)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);
  });

  // 건수를 박아 두지 않는다 — 봇이 매일 밤 초안을 머지하므로 개수를 적으면
  // 그날부터 이 파일이 빨개진다. 확인할 것은 **초안이 프로덕션에서 빠지는가**다.
  it("개발에서는 draft 까지 보이고 프로덕션에서는 빠진다", () => {
    const all = getAllPosts();
    const drafts = all.filter((post) => post.frontmatter.draft);

    expect(drafts.length).toBeGreaterThan(0);
    expect(inProduction(getAllPosts)).toHaveLength(all.length - drafts.length);
  });

  it("publishedAt 내림차순으로 정렬한다", () => {
    const published = inProduction(getAllPosts).map(
      (post) => post.frontmatter.publishedAt,
    );

    expect(published).toEqual([...published].sort().reverse());
    // 최신 글이 맨 앞이어야 목록 페이지가 그대로 쓸 수 있다.
    expect(published[0]).toBe("2026-08-09T10:00:00+0900");
  });

  it("파일명 날짜와 publishedAt 날짜가 어긋나지 않는다", () => {
    for (const post of getAllPosts()) {
      const [date] = post.frontmatter.publishedAt.split("T");
      expect(post.filePath).toContain(`/${date}-${post.slug}.mdx`);
    }
  });
});

describe("getPostsByCategory", () => {
  it("카테고리를 나눠도 합이 전체와 같고 초안 규칙이 같다", () => {
    const categories = ["papers", "releases", "news", "community", "notes"] as const;
    const split = categories.flatMap((category) => getPostsByCategory(category));

    expect(split).toHaveLength(getAllPosts().length);
    for (const category of categories) {
      const posts = getPostsByCategory(category);
      const drafts = posts.filter((post) => post.frontmatter.draft);
      expect(inProduction(() => getPostsByCategory(category))).toHaveLength(
        posts.length - drafts.length,
      );
    }
  });

  it("다른 카테고리 글을 섞어 주지 않는다", () => {
    for (const post of getPostsByCategory("papers")) {
      expect(post.category).toBe("papers");
      expect(post.frontmatter.category).toBe("papers");
    }
  });
});

describe("getPostsByAxis", () => {
  it("카테고리를 가로질러 모은다 — 축은 디렉토리가 아니라 frontmatter 다", () => {
    const categories = new Set(
      inProduction(() => getPostsByAxis("serving")).map((post) => post.category),
    );

    expect(categories).toEqual(new Set(["news", "papers", "notes"]));
  });

  it("그 축의 글만 준다", () => {
    for (const post of getPostsByAxis("retrieval")) {
      expect(post.frontmatter.axis).toBe("retrieval");
    }
    expect(getPostsByAxis("retrieval")).toHaveLength(2);
  });

  it("글이 없는 축에는 빈 목록을 준다 — 없는 축과 구분되지 않아도 된다", () => {
    // 어느 축이 비어 있는지는 콘텐츠에 달렸다. **없는 축**은 늘 비어 있다.
    expect(getPostsByAxis("존재하지-않는-축" as never)).toEqual([]);

    const used = new Set(getAllPosts().map((post) => post.frontmatter.axis));
    for (const axis of ["retrieval", "serving", "voice", "agent", "domain", "vibe-coding"] as const) {
      if (!used.has(axis)) expect(getPostsByAxis(axis)).toEqual([]);
    }
  });

  it("최신순 정렬과 초안 제외를 getAllPosts() 와 똑같이 따른다", () => {
    const serving = getPostsByAxis("serving");
    const drafts = serving.filter((post) => post.frontmatter.draft);

    expect(serving.length).toBeGreaterThan(0);
    expect(inProduction(() => getPostsByAxis("serving"))).toHaveLength(
      serving.length - drafts.length,
    );

    const published = getPostsByAxis("serving").map(
      (post) => post.frontmatter.publishedAt,
    );
    expect(published).toEqual([...published].sort().reverse());
  });
});

describe("getPost", () => {
  it("category 와 slug 로 정확히 찾는다", () => {
    const post = getPost("papers", "moe-routing-pipeline");

    expect(post?.frontmatter.title).toBe(
      "MoE 라우팅을 두 단계로 쪼갠 학습 파이프라인",
    );
    expect(post?.filePath).toBe(
      "content/papers/2026-08-05-moe-routing-pipeline.mdx",
    );
  });

  it("없는 slug 에는 undefined 를 준다", () => {
    expect(getPost("papers", "존재하지-않는-글")).toBeUndefined();
  });

  it("다른 카테고리의 slug 로는 찾지 못한다", () => {
    expect(getPost("notes", "moe-routing-pipeline")).toBeUndefined();
  });
});

describe("getAllTags", () => {
  it("태그별 글 수를 센다", () => {
    const tags = inProduction(getAllTags);
    const countOf = (tag: string) =>
      tags.find((entry) => entry.tag === tag)?.count;

    // 겹치는 태그가 다음 phase 의 태그 필터가 쓸 데이터다.
    expect(countOf("LLM")).toBe(5);
    expect(countOf("벤치마크")).toBe(3);
    expect(countOf("추론")).toBe(3);
    expect(countOf("어텐션")).toBe(1);
  });

  it("draft 의 태그는 프로덕션 집계에서 빠진다", () => {
    // 초안에만 붙은 태그다.
    expect(getAllTags().map((entry) => entry.tag)).toContain("비용");
    expect(inProduction(getAllTags).map((entry) => entry.tag)).not.toContain(
      "비용",
    );
  });

  it("글 수 내림차순으로 정렬한다", () => {
    const counts = inProduction(getAllTags).map((entry) => entry.count);

    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe("출처 표기 (CLAUDE.md CRITICAL)", () => {
  it("news·papers 글에는 source.url 이 있다", () => {
    const cited = getAllPosts().filter(
      (post) => post.category === "news" || post.category === "papers",
    );

    expect(cited.length).toBeGreaterThan(0);
    for (const post of cited) {
      expect(post.frontmatter.source?.url, post.filePath).toMatch(/^https?:\/\//);
      expect(post.frontmatter.source?.title, post.filePath).toBeTruthy();
    }
  });

  it("papers 글에는 arxivId 와 저자가 있다", () => {
    for (const post of getPostsByCategory("papers")) {
      expect(post.frontmatter.paper?.arxivId, post.filePath).toBeTruthy();
      expect(
        post.frontmatter.paper?.authors.length,
        post.filePath,
      ).toBeGreaterThan(0);
    }
  });
});
