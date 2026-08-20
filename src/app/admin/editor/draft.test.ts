import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "@/lib/content/schema";

import {
  draftFilePath,
  isValidSlug,
  newDraft,
  nowKstIso,
  parsePostPath,
  suggestSlug,
  toDraftForm,
  toFrontmatterObject,
  validateDraft,
  type DraftForm,
} from "./draft";
import { serializeDraft } from "./serialize";

/** 검증을 통과하는 최소 폼. 케이스별로 덮어써서 쓴다. */
function validForm(overrides: Partial<DraftForm> = {}): DraftForm {
  return {
    ...newDraft("2026-08-13T09:00:00+0900"),
    title: "예시 글",
    category: "news",
    slug: "example-post",
    summary: "예시 요약",
    body: "본문입니다.",
    ...overrides,
  };
}

describe("slug 검증", () => {
  it("영소문자·숫자·하이픈 조합을 통과시킨다", () => {
    expect(isValidSlug("moe-routing-pipeline")).toBe(true);
    expect(isValidSlug("gpt5")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it("한글·공백·대문자를 거부한다", () => {
    expect(isValidSlug("한글-슬러그")).toBe(false);
    expect(isValidSlug("two words")).toBe(false);
    expect(isValidSlug("Uppercase")).toBe(false);
  });

  it("연속 하이픈과 앞뒤 하이픈을 거부한다", () => {
    expect(isValidSlug("double--hyphen")).toBe(false);
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("trailing-")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("제목에서 slug 후보를 만들되 한글은 로마자화하지 않는다", () => {
    expect(suggestSlug("MoE Routing, Revisited!")).toBe("moe-routing-revisited");
    // 한글 제목은 후보가 비어 사용자가 직접 채우게 된다.
    expect(suggestSlug("희소 어텐션은 어디까지 버티는가")).toBe("");
  });
});

describe("파일 경로", () => {
  it("(category, publishedAt, slug) 로 규약 경로를 만든다", () => {
    expect(
      draftFilePath("papers", "2026-08-05T13:00:00+0900", "moe-routing"),
    ).toBe("content/papers/2026-08-05-moe-routing.mdx");
  });

  it("slug 나 날짜가 아직 쓸 수 없으면 null 이다", () => {
    expect(draftFilePath("notes", "2026-08-05T13:00:00+0900", "한글")).toBeNull();
    expect(draftFilePath("notes", "", "ok-slug")).toBeNull();
  });

  it("편집 링크의 경로를 되읽는다", () => {
    expect(parsePostPath("content/papers/2026-08-05-moe-routing.mdx")).toEqual({
      category: "papers",
      date: "2026-08-05",
      slug: "moe-routing",
    });
    // 모르는 카테고리·규약 밖 파일명은 받지 않는다.
    expect(parsePostPath("content/recipes/2026-08-05-x.mdx")).toBeNull();
    expect(parsePostPath("content/notes/no-date.mdx")).toBeNull();
  });
});

describe("KST 시각", () => {
  it("+0900 으로 끝나고 스키마를 통과한다", () => {
    const value = nowKstIso();

    expect(value).toMatch(/\+0900$/);
    expect(() =>
      parseFrontmatter(
        {
          title: "t",
          category: "notes",
          axis: "serving",
          summary: "s",
          publishedAt: value,
        },
        "content/notes/x.mdx",
      ),
    ).not.toThrow();
  });

  it("UTC 시각을 KST 벽시계로 옮긴다", () => {
    expect(nowKstIso(new Date("2026-08-13T00:00:00Z"))).toBe(
      "2026-08-13T09:00:00+0900",
    );
  });
});

describe("frontmatter 직렬화", () => {
  it("한글 제목·태그가 gray-matter 왕복에서 그대로 남는다", () => {
    const form = validForm({
      title: "희소 어텐션은 어디까지 버티는가",
      category: "papers",
      slug: "sparse-attention",
      summary: "한글 요약 — 콜론: 포함",
      tags: "LLM, 어텐션, 추론",
      draft: true,
      paperArxivId: "2607.04512",
      paperAuthors: "L. Amari, R. Okonkwo",
      sourceUrl: "https://arxiv.org/abs/2607.04512",
      sourceTitle: "Sparsity Budgets for Long-Sequence Attention",
      body: "본문 **굵게**\n\n두 번째 문단",
    });

    const mdx = serializeDraft(form);
    const parsed = matter(mdx);

    expect(parsed.data).toEqual(toFrontmatterObject(form));
    expect(parsed.data.title).toBe("희소 어텐션은 어디까지 버티는가");
    expect(parsed.data.tags).toEqual(["LLM", "어텐션", "추론"]);
    expect(parsed.content.trim()).toBe(form.body);
    // 왕복한 값이 실제 스키마도 통과해야 발행이 안전하다.
    expect(() =>
      parseFrontmatter(parsed.data, "content/papers/x.mdx"),
    ).not.toThrow();
  });

  it("비어 있는 선택 필드는 파일에 남기지 않는다", () => {
    const frontmatter = toFrontmatterObject(validForm());

    expect(frontmatter).not.toHaveProperty("source");
    expect(frontmatter).not.toHaveProperty("paper");
    expect(frontmatter).not.toHaveProperty("cover");
    expect(frontmatter).not.toHaveProperty("updatedAt");
  });

  it("레포에서 읽은 frontmatter 를 폼으로 옮긴다", () => {
    const form = toDraftForm(
      {
        title: "긴 문맥 벤치마크",
        category: "papers",
        summary: "요약",
        publishedAt: "2026-06-29T21:10:00+0900",
        tags: ["LLM", "벤치마크"],
        draft: false,
        source: { url: "https://arxiv.org/abs/2606.11890", title: "Survey" },
        paper: { arxivId: "2606.11890", authors: ["S. Bergmann", "T. Iwata"] },
      },
      "\n본문\n",
      "content/papers/2026-06-29-long-context-benchmark.mdx",
    );

    expect(form.slug).toBe("long-context-benchmark");
    expect(form.tags).toBe("LLM, 벤치마크");
    expect(form.paperAuthors).toBe("S. Bergmann, T. Iwata");
    expect(form.sourceUrl).toBe("https://arxiv.org/abs/2606.11890");
    expect(form.body).toBe("\n본문\n");
  });

  it("frontmatter 가 깨진 글도 경로에서 카테고리·slug 를 살려 연다", () => {
    const form = toDraftForm(
      { title: 42 },
      "본문",
      "content/notes/2026-08-02-quantization-notes.mdx",
    );

    expect(form.category).toBe("notes");
    expect(form.slug).toBe("quantization-notes");
    expect(form.title).toBe("42");
    expect(form.publishedAt).toBe("");
  });
});

/**
 * 폼이 모르는 필드는 저장할 때 조용히 사라지고, `lead`·`source.words`·`source.image`·
 * `selection` 은 전부 그 유실을 스키마가 못 잡는다 (앞의 둘은 기본값이 있고, 뒤의 둘은
 * 선택 필드다). **그 넷을 가진 글이 픽스처인 이유**가 여기 있다.
 *
 * `selection` 이 특히 위험하다 — **봇 글 전부가 그 칸을 갖는데 폼에는 입력란이 없다.**
 * 사람이 봇 글을 열어 오타 하나 고치고 저장하면 선별 경위가 통째로 사라지고, 빌드도
 * 테스트도 아무 말을 하지 않는다. 그래서 폼이 모양을 보지 않고 그대로 지고 간다.
 * (실제 글 전부를 훑는 왕복 검사는 아래 `it.each` 가 따로 한다.)
 */
describe("에디터 왕복 — 무손실", () => {
  const POST_PATH = "content/papers/2026-08-05-moe-routing-pipeline.mdx";
  const file = matter(
    readFileSync(
      path.join(
        process.cwd(),
        "src/lib/content/__fixtures__/roundtrip-words-selection.mdx",
      ),
      "utf8",
    ),
  );

  it("실제 글을 폼으로 옮겼다 되돌려도 frontmatter 가 그대로다", () => {
    const form = toDraftForm(file.data, file.content, POST_PATH);

    expect(form.axis).toBe("serving");
    expect(form.format).toBe("explainer");
    expect(form.sourceWords).toBe("3240");
    expect(form.sourceImage).toBe("https://arxiv.org/html/2608.00001v1/x1.png");
    expect(form.selection).toEqual({
      axisBy: "llm",
      axisConfidence: "high",
      band: "mid",
      crossSources: 3,
      popularity: { kind: "hf-upvotes", count: 147 },
    });

    // draft 는 폼이 항상 적어 낸다 — 그것 말고는 한 글자도 달라지면 안 된다.
    expect(toFrontmatterObject(form)).toEqual({ ...file.data, draft: false });
  });

  it("되돌린 frontmatter 가 스키마도 통과한다", () => {
    const form = toDraftForm(file.data, file.content, POST_PATH);

    const parsed = parseFrontmatter(toFrontmatterObject(form), POST_PATH);

    expect(parsed.source?.words).toBe(3240);
  });

  it("죽은 `lead` 가 남은 파일을 열면 폼이 그 칸을 떨어뜨린다", () => {
    // 봇이 아직 그 칸을 쓰고 있어도 발행은 막히지 않고(스키마가 모르는 칸을 버린다),
    // 사람이 한 번 열었다 저장하면 파일에서도 사라진다.
    const form = toDraftForm({ ...file.data, lead: true }, file.content, POST_PATH);

    expect("lead" in toFrontmatterObject(form)).toBe(false);
  });

  it("source.words 가 숫자가 아니면 버리지 않고 스키마에 걸리게 둔다", () => {
    const issues = validateDraft(validForm({ sourceWords: "삼천이백사십" }));

    expect(issues.map((issue) => issue.field)).toContain("source.words");
  });

  /**
   * 위 케이스는 글 하나만 잰다. 카테고리 개편처럼 slug 이 바뀌는 변경은 그 한 글을 비껴갈 수 있어
   * 레포의 **모든** 글을 훑는다 — 초안도 포함한다 (관리자는 초안을 열어 고치러 들어온다).
   *
   * 특히 `category` 는 유실이 조용하다. `toDraftForm` 은 모르는 slug 을 만나면 frontmatter 도
   * 경로도 못 읽고 `CATEGORIES[0]`(papers) 으로 떨어뜨리므로, 옛 slug 이 남은 글을 열었다 저장하면
   * 카테고리가 말없이 바뀐다. 스키마는 값이 유효하기만 하면 통과시켜 이걸 잡지 못한다.
   */
  it.each(
    readdirSync(path.join(process.cwd(), "content"))
      .flatMap((category) =>
        readdirSync(path.join(process.cwd(), "content", category))
          .filter((file) => file.endsWith(".mdx"))
          .map((file) => `content/${category}/${file}`),
      )
      .map((postPath) => [postPath] as const),
  )("%s 를 폼으로 옮겼다 되돌려도 그대로다", (postPath) => {
    const post = matter(
      readFileSync(path.join(process.cwd(), postPath), "utf8"),
    );
    const form = toDraftForm(post.data, post.content, postPath);

    // 경로의 디렉토리 = frontmatter 의 category. 둘이 갈리면 목록·링크가 어긋난다.
    expect(form.category).toBe(postPath.split("/")[1]);

    // `draft` 는 폼이 늘 적어 낸다 — 파일이 생략했으면 false 가 붙는다.
    // 스키마 기본값과 같은 값이라 뜻이 달라지지 않는다. 그것 말고 한 글자라도 달라지면 유실이다.
    expect(toFrontmatterObject(form)).toEqual({
      draft: false,
      ...post.data,
    });
  });
});

describe("validateDraft — 스키마 재사용", () => {
  it("정상 폼은 지적할 것이 없다", () => {
    expect(validateDraft(validForm())).toEqual([]);
  });

  it("잘못된 slug 를 필드 이름과 함께 지적한다", () => {
    const issues = validateDraft(validForm({ slug: "한글" }));

    expect(issues.map((issue) => issue.field)).toContain("slug");
  });

  it("스키마 규칙(KST·papers 의 paper 필수)을 그대로 적용한다", () => {
    const kst = validateDraft(
      validForm({ publishedAt: "2026-08-13T00:00:00Z" }),
    );
    expect(kst.map((issue) => issue.field)).toContain("publishedAt");

    const paper = validateDraft(
      validForm({ category: "papers", slug: "no-paper-meta" }),
    );
    expect(paper.map((issue) => issue.field)).toContain("paper");
  });
});
