import { describe, expect, it } from "vitest";

import {
  defaultCommitMessage,
  parseDeleteRequest,
  parseSaveRequest,
  validatePostPath,
} from "./publish";

/**
 * 이 라우트는 인증된 사람이 레포에 파일을 쓰는 통로다.
 * 경로 검증이 뚫리면 `.github/workflows/*` 나 `src/*` 가 덮어써진다 — 그래서 거부 케이스가 본체다.
 */
const FRONTMATTER = [
  "---",
  "title: 테스트 글",
  "category: papers",
  "axis: serving",
  "summary: 검증용 요약",
  "publishedAt: '2026-08-05T09:00:00+0900'",
  "tags:",
  "  - LLM",
  "draft: true",
  "source:",
  "  url: https://arxiv.org/abs/2606.11890",
  "  title: Sparse Routing",
  "paper:",
  "  arxivId: '2606.11890'",
  "  authors:",
  "    - S. Bergmann",
  "---",
  "",
  "본문이다.",
  "",
].join("\n");

const VALID_PATH = "content/papers/2026-08-05-moe-routing.mdx";

function saved(overrides: Record<string, unknown> = {}) {
  return parseSaveRequest({
    path: VALID_PATH,
    content: FRONTMATTER,
    ...overrides,
  });
}

describe("validatePostPath", () => {
  it("content/{category}/YYYY-MM-DD-{slug}.mdx 를 통과시키고 조각을 돌려준다", () => {
    const result = validatePostPath(VALID_PATH);

    expect(result).toEqual({
      ok: true,
      value: {
        path: VALID_PATH,
        category: "papers",
        date: "2026-08-05",
        slug: "moe-routing",
      },
    });
  });

  it("하이픈이 여러 개인 slug 와 다른 카테고리도 통과한다", () => {
    for (const path of [
      "content/releases/2026-01-05-a-b-c.mdx",
      "content/notes/2026-12-31-x1.mdx",
    ]) {
      expect(validatePostPath(path).ok).toBe(true);
    }
  });

  // 경로 순회 — 이 목록이 이 step 의 안전장치다.
  it.each([
    ["상위 경로 순회", "../../.github/workflows/deploy.yml"],
    ["content 안에서의 순회", "content/papers/../../src/app/page.tsx"],
    ["절대 경로", "/etc/passwd"],
    ["퍼센트 인코딩된 구분자", "content%2f..%2fsrc%2fa.ts"],
    ["퍼센트 인코딩된 점", "content/papers/%2e%2e/2026-08-05-x.mdx"],
    ["백슬래시", "content\\papers\\2026-08-05-x.mdx"],
    ["워크플로 파일", ".github/workflows/ci.yml"],
    ["소스 파일", "src/lib/auth.ts"],
    ["가드레일 문서", "CLAUDE.md"],
    ["모르는 카테고리", "content/secrets/2026-08-05-x.mdx"],
    ["카테고리 없음", "content/2026-08-05-x.mdx"],
    ["한글 slug", "content/papers/2026-08-05-한글.mdx"],
    ["대문자 slug", "content/papers/2026-08-05-Foo.mdx"],
    ["하이픈으로 끝나는 slug", "content/papers/2026-08-05-foo-.mdx"],
    ["mdx 가 아닌 확장자", "content/papers/2026-08-05-foo.txt"],
    ["날짜 없음", "content/papers/moe-routing.mdx"],
    ["업로드 경로", "public/uploads/2026/08/05-093000-x.png"],
    ["빈 문자열", ""],
    ["앞뒤 공백", " content/papers/2026-08-05-x.mdx "],
  ])("%s 는 거부한다: %s", (_label, path) => {
    const result = validatePostPath(path);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("경로");
  });

  it("문자열이 아니면 거부한다", () => {
    for (const value of [undefined, null, 42, {}, ["content/notes/x.mdx"]]) {
      expect(validatePostPath(value).ok).toBe(false);
    }
  });
});

describe("defaultCommitMessage", () => {
  it("Conventional Commits 형태다", () => {
    expect(defaultCommitMessage("create", "papers", "moe-routing")).toBe(
      "feat(content): papers/moe-routing",
    );
    expect(defaultCommitMessage("update", "papers", "moe-routing")).toBe(
      "fix(content): papers/moe-routing",
    );
    expect(defaultCommitMessage("delete", "notes", "scrap")).toBe(
      "chore(content): remove notes/scrap",
    );

    for (const action of ["create", "update", "delete"] as const) {
      expect(defaultCommitMessage(action, "notes", "x")).toMatch(
        /^(feat|fix|chore)\(content\): /,
      );
    }
  });
});

describe("parseSaveRequest", () => {
  it("정상 요청을 통과시킨다", () => {
    const result = saved();

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toMatchObject({
      path: VALID_PATH,
      category: "papers",
      slug: "moe-routing",
      sha: undefined,
    });
  });

  it("sha 가 없으면 신규 커밋 메시지, 있으면 수정 커밋 메시지를 기본값으로 쓴다", () => {
    const create = saved();
    const update = saved({ sha: "abc123" });

    expect(create.ok && create.value.message).toBe(
      "feat(content): papers/moe-routing",
    );
    expect(update.ok && update.value.message).toBe(
      "fix(content): papers/moe-routing",
    );
    expect(update.ok && update.value.sha).toBe("abc123");
  });

  it("사용자가 넣은 메시지를 쓰되 공백만 있으면 기본값으로 돌아간다", () => {
    const custom = saved({ message: "  docs(content): 오타 수정  " });
    const blank = saved({ message: "   " });

    expect(custom.ok && custom.value.message).toBe("docs(content): 오타 수정");
    expect(blank.ok && blank.value.message).toBe(
      "feat(content): papers/moe-routing",
    );
  });

  it("경로가 화이트리스트 밖이면 거부한다", () => {
    expect(saved({ path: "../../.github/workflows/x.yml" }).ok).toBe(false);
  });

  it("frontmatter 검증에 실패하면 필드별 사유와 함께 거부한다", () => {
    const result = saved({
      content: FRONTMATTER.replace("publishedAt: '2026-08-05T09:00:00+0900'", "publishedAt: '2026-08-05T09:00:00Z'"),
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.issues).toEqual([
      expect.objectContaining({ field: "publishedAt" }),
    ]);
  });

  it("YAML 이 깨졌으면 커밋하지 않고 거부한다", () => {
    const result = saved({ content: "---\ntitle: [깨진\n---\n본문\n" });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("frontmatter");
  });

  it("frontmatter 가 아예 없으면 거부한다", () => {
    expect(saved({ content: "# 제목만 있는 본문\n" }).ok).toBe(false);
  });

  it("경로의 카테고리와 frontmatter 의 category 가 어긋나면 거부한다", () => {
    const result = parseSaveRequest({
      path: "content/notes/2026-08-05-moe-routing.mdx",
      content: FRONTMATTER,
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.issues).toEqual([
      expect.objectContaining({ field: "category" }),
    ]);
  });

  it("본문이 문자열이 아니거나 body 가 객체가 아니면 거부한다", () => {
    expect(saved({ content: 42 }).ok).toBe(false);
    expect(parseSaveRequest(null).ok).toBe(false);
    expect(parseSaveRequest("content").ok).toBe(false);
  });

  it("sha 가 문자열이 아니면 거부한다 (엉뚱한 값으로 덮어쓰기를 시도하지 않는다)", () => {
    expect(saved({ sha: 123 }).ok).toBe(false);
  });
});

describe("parseDeleteRequest", () => {
  it("path 와 sha 를 요구하고 기본 메시지를 채운다", () => {
    const result = parseDeleteRequest({ path: VALID_PATH, sha: "abc123" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual({
      path: VALID_PATH,
      category: "papers",
      slug: "moe-routing",
      sha: "abc123",
      message: "chore(content): remove papers/moe-routing",
    });
  });

  it("sha 가 없으면 거부한다 — 삭제는 대상을 특정해야 한다", () => {
    expect(parseDeleteRequest({ path: VALID_PATH }).ok).toBe(false);
    expect(parseDeleteRequest({ path: VALID_PATH, sha: "" }).ok).toBe(false);
  });

  it("경로 순회는 삭제에서도 막는다", () => {
    expect(
      parseDeleteRequest({
        path: "../../.github/workflows/ci.yml",
        sha: "abc123",
      }).ok,
    ).toBe(false);
  });
});
