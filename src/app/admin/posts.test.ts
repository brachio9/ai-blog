import { describe, expect, it } from "vitest";

import type { RemotePostSummary } from "@/services/github";
import type { PostFrontmatter } from "@/types/content";

import {
  editorHref,
  filterByCategory,
  resolveCategoryFilter,
  toAdminRows,
  withViews,
} from "./posts";

function frontmatter(
  overrides: Partial<PostFrontmatter> = {},
): PostFrontmatter {
  return {
    title: "제목",
    category: "papers",
    summary: "요약",
    publishedAt: "2026-08-05T09:00:00+0900",
    tags: ["tag"],
    draft: false,
    lead: false,
    ...overrides,
  };
}

function summary(
  overrides: Partial<RemotePostSummary> = {},
): RemotePostSummary {
  return {
    path: "content/papers/2026-08-05-moe.mdx",
    category: "papers",
    slug: "moe",
    sha: "sha1",
    frontmatter: frontmatter(),
    ...overrides,
  };
}

describe("toAdminRows", () => {
  it("frontmatter 를 행으로 옮기고 조회수 키를 {category}/{slug} 로 만든다", () => {
    const [row] = toAdminRows([summary()]);

    expect(row).toMatchObject({
      path: "content/papers/2026-08-05-moe.mdx",
      postId: "papers/moe",
      title: "제목",
      publishedAt: "2026-08-05T09:00:00+0900",
      fileDate: "2026-08-05",
      tags: ["tag"],
      draft: false,
    });
    expect(row.error).toBeUndefined();
  });

  it("발행일 내림차순으로 세운다", () => {
    const rows = toAdminRows([
      summary({
        path: "content/notes/2026-07-11-old.mdx",
        category: "notes",
        slug: "old",
        frontmatter: frontmatter({
          category: "notes",
          publishedAt: "2026-07-11T09:00:00+0900",
        }),
      }),
      summary({
        path: "content/hf-blog/2026-08-09-new.mdx",
        category: "hf-blog",
        slug: "new",
        frontmatter: frontmatter({
          category: "hf-blog",
          publishedAt: "2026-08-09T09:00:00+0900",
        }),
      }),
      summary(),
    ]);

    expect(rows.map((row) => row.slug)).toEqual(["new", "moe", "old"]);
  });

  it("draft 를 그대로 싣는다", () => {
    const [row] = toAdminRows([
      summary({ frontmatter: frontmatter({ draft: true }) }),
    ]);

    expect(row.draft).toBe(true);
  });

  it("frontmatter 가 깨진 글도 파일명·오류와 함께 남는다", () => {
    const rows = toAdminRows([
      summary({ frontmatter: null, error: "title 은 비어 있을 수 없다" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "2026-08-05-moe.mdx",
      publishedAt: null,
      fileDate: "2026-08-05",
      tags: [],
      draft: false,
      error: "title 은 비어 있을 수 없다",
    });
  });

  it("깨진 글은 파일명 날짜로 정렬 자리를 잡는다 (목록 끝으로 밀리지 않는다)", () => {
    const rows = toAdminRows([
      summary({
        path: "content/notes/2026-06-14-oldest.mdx",
        category: "notes",
        slug: "oldest",
        frontmatter: frontmatter({
          category: "notes",
          publishedAt: "2026-06-14T09:00:00+0900",
        }),
      }),
      summary({
        path: "content/notes/2026-08-11-broken.mdx",
        category: "notes",
        slug: "broken",
        frontmatter: null,
        error: "YAML 이 깨졌다",
      }),
      summary(),
    ]);

    expect(rows.map((row) => row.slug)).toEqual(["broken", "moe", "oldest"]);
  });
});

describe("resolveCategoryFilter", () => {
  it("아는 카테고리만 통과시킨다", () => {
    expect(resolveCategoryFilter("papers")).toBe("papers");
    expect(resolveCategoryFilter("../etc")).toBeUndefined();
    expect(resolveCategoryFilter(undefined)).toBeUndefined();
    expect(resolveCategoryFilter("")).toBeUndefined();
  });

  it("같은 키가 여러 번 오면 첫 값을 쓴다", () => {
    expect(resolveCategoryFilter(["notes", "papers"])).toBe("notes");
  });
});

describe("filterByCategory", () => {
  const rows = toAdminRows([
    summary(),
    summary({
      path: "content/notes/2026-08-02-quant.mdx",
      category: "notes",
      slug: "quant",
      frontmatter: frontmatter({ category: "notes" }),
    }),
  ]);

  it("카테고리로 거른다", () => {
    expect(filterByCategory(rows, "notes").map((row) => row.slug)).toEqual([
      "quant",
    ]);
  });

  it("필터가 없으면 전부 준다", () => {
    expect(filterByCategory(rows)).toHaveLength(2);
  });
});

describe("withViews", () => {
  it("postId 로 조회수를 붙이고 없는 글은 0 으로 둔다", () => {
    const rows = withViews(toAdminRows([summary()]), { "papers/moe": 42 });
    expect(rows[0].views).toBe(42);

    const missing = withViews(toAdminRows([summary()]), {});
    expect(missing[0].views).toBe(0);
  });
});

describe("editorHref", () => {
  it("편집 대상 경로를 ?path= 로 넘긴다", () => {
    expect(editorHref("content/papers/2026-08-05-moe.mdx")).toBe(
      "/admin/editor?path=content%2Fpapers%2F2026-08-05-moe.mdx",
    );
  });
});
