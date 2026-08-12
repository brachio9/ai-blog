import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "./schema";

const FILE_PATH = "content/hf-blog/2026-08-12-example.mdx";

/** 최소 필수 필드만 담은 정상 frontmatter. 케이스별로 덮어써서 쓴다. */
function validFrontmatter(overrides: Record<string, unknown> = {}) {
  return {
    title: "예시 글",
    category: "hf-blog",
    summary: "예시 요약",
    publishedAt: "2026-08-12T15:46:52+0900",
    ...overrides,
  };
}

describe("parseFrontmatter — 정상 케이스", () => {
  it("필수 필드만 있어도 통과하고 tags/draft 기본값이 채워진다", () => {
    const parsed = parseFrontmatter(validFrontmatter(), FILE_PATH);

    expect(parsed.title).toBe("예시 글");
    expect(parsed.category).toBe("hf-blog");
    expect(parsed.tags).toEqual([]);
    expect(parsed.draft).toBe(false);
  });

  it("papers 는 paper 메타와 함께 통과한다", () => {
    const parsed = parseFrontmatter(
      validFrontmatter({
        category: "papers",
        paper: { arxivId: "2501.00001", authors: ["Ada Lovelace"] },
      }),
      "content/papers/2026-08-12-example.mdx",
    );

    expect(parsed.paper?.arxivId).toBe("2501.00001");
  });

  it("source 와 updatedAt 이 있으면 그대로 보존한다", () => {
    const parsed = parseFrontmatter(
      validFrontmatter({
        updatedAt: "2026-08-13T09:00:00+0900",
        tags: ["llm"],
        draft: true,
        source: {
          url: "https://huggingface.co/blog/example",
          title: "Example",
          license: "cc-by-4.0",
        },
      }),
      FILE_PATH,
    );

    expect(parsed.updatedAt).toBe("2026-08-13T09:00:00+0900");
    expect(parsed.tags).toEqual(["llm"]);
    expect(parsed.draft).toBe(true);
    expect(parsed.source?.url).toBe("https://huggingface.co/blog/example");
  });
});

describe("parseFrontmatter — KST 강제", () => {
  it("publishedAt 이 Z 로 끝나면 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({ publishedAt: "2026-08-12T06:46:52Z" }),
        FILE_PATH,
      ),
    ).toThrow(/publishedAt/);
  });

  it("publishedAt 이 다른 오프셋이면 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({ publishedAt: "2026-08-12T15:46:52+0100" }),
        FILE_PATH,
      ),
    ).toThrow(/\+0900/);
  });

  it("updatedAt 도 같은 규칙을 적용한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({ updatedAt: "2026-08-13T00:00:00Z" }),
        FILE_PATH,
      ),
    ).toThrow(/updatedAt/);
  });

  it("존재하지 않는 날짜는 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({ publishedAt: "2026-13-01T00:00:00+0900" }),
        FILE_PATH,
      ),
    ).toThrow(/publishedAt/);
  });
});

describe("parseFrontmatter — 카테고리", () => {
  it("알 수 없는 category 를 거부한다", () => {
    expect(() =>
      parseFrontmatter(validFrontmatter({ category: "tutorials" }), FILE_PATH),
    ).toThrow(/category/);
  });

  it("category: papers 인데 paper 가 없으면 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({ category: "papers" }),
        "content/papers/2026-08-12-example.mdx",
      ),
    ).toThrow(/paper/);
  });

  it("category: notes 인데 paper 가 있으면 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({
          category: "notes",
          paper: { arxivId: "2501.00001", authors: ["Ada Lovelace"] },
        }),
        "content/notes/2026-08-12-example.mdx",
      ),
    ).toThrow(/paper/);
  });
});

describe("parseFrontmatter — 필수 필드와 출처", () => {
  it("title 이 없으면 거부한다", () => {
    expect(() =>
      parseFrontmatter(validFrontmatter({ title: undefined }), FILE_PATH),
    ).toThrow(/title/);
  });

  it("summary 가 빈 문자열이면 거부한다", () => {
    expect(() =>
      parseFrontmatter(validFrontmatter({ summary: "" }), FILE_PATH),
    ).toThrow(/summary/);
  });

  it("source.url 이 URL 이 아니면 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({
          source: { url: "그냥 문자열", title: "Example" },
        }),
        FILE_PATH,
      ),
    ).toThrow(/source\.url/);
  });

  it("source 에 원문 제목이 없으면 거부한다", () => {
    expect(() =>
      parseFrontmatter(
        validFrontmatter({ source: { url: "https://example.com/a" } }),
        FILE_PATH,
      ),
    ).toThrow(/source\.title/);
  });

  it("frontmatter 자체가 없으면 거부한다", () => {
    expect(() => parseFrontmatter(undefined, FILE_PATH)).toThrow();
  });
});

describe("parseFrontmatter — 에러 메시지", () => {
  it("에러 메시지에 파일 경로가 들어 있다", () => {
    expect(() =>
      parseFrontmatter(validFrontmatter({ category: "tutorials" }), FILE_PATH),
    ).toThrow(FILE_PATH);
  });

  it("에러 메시지에 어떤 필드가 왜 틀렸는지 들어 있다", () => {
    let message = "";
    try {
      parseFrontmatter(
        validFrontmatter({ publishedAt: "2026-08-12T06:46:52Z", summary: "" }),
        FILE_PATH,
      );
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(FILE_PATH);
    expect(message).toContain("publishedAt");
    expect(message).toContain("summary");
  });
});
