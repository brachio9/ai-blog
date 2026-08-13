import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 라우트 자체를 부른다 — 인증·검증이 **커밋보다 먼저** 일어나는지가 핵심이다.
 * 통과하지 못한 요청에서는 fetch 가 단 한 번도 불리면 안 된다 (= GitHub 에 아무것도 나가지 않았다).
 *
 * next-auth 는 vitest 에서 next/server 를 못 찾으므로 @/lib/auth 를 통째로 모킹한다
 * (step 0 이 같은 이유로 판정 순수함수를 auth-allowlist.ts 로 분리해 두었다).
 */
vi.mock("@/lib/auth", () => ({ getAdminLogin: vi.fn() }));

const { getAdminLogin } = await import("@/lib/auth");
const { DELETE, POST } = await import("./route");

const adminLogin = vi.mocked(getAdminLogin);

/** 이 문자열이 응답 어디에도 새어 나오면 안 된다 (CLAUDE.md CRITICAL). */
const TOKEN = "github_pat_11ABCDEFG_verysecretvalue";

const VALID_PATH = "content/papers/2026-08-05-moe-routing.mdx";

const CONTENT = [
  "---",
  "title: 테스트 글",
  "category: papers",
  "summary: 검증용 요약",
  "publishedAt: '2026-08-05T09:00:00+0900'",
  "tags: []",
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

const fetchMock = vi.fn();

function request(body: unknown): Request {
  return { json: async () => body } as Request;
}

function respond(status: number, body: unknown): void {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function commitOk(): void {
  respond(200, {
    content: { sha: "new-sha" },
    commit: { html_url: "https://github.com/owner/repo/commit/abc" },
  });
}

function sentBody(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return JSON.parse(String((init as RequestInit).body)) as Record<
    string,
    unknown
  >;
}

beforeEach(() => {
  vi.stubEnv("GITHUB_CONTENT_REPO", "owner/repo");
  vi.stubEnv("GITHUB_CONTENT_BRANCH", "main");
  vi.stubEnv("GITHUB_CONTENT_TOKEN", TOKEN);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  adminLogin.mockResolvedValue("owner");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/publish — 인증", () => {
  it("세션이 없으면 404 이고 GitHub 에 아무것도 나가지 않는다", async () => {
    adminLogin.mockResolvedValue(null);

    const response = await POST(request({ path: VALID_PATH, content: CONTENT }));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("삭제도 마찬가지다", async () => {
    adminLogin.mockResolvedValue(null);

    const response = await DELETE(request({ path: VALID_PATH, sha: "abc" }));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/publish — 검증", () => {
  it.each([
    "../../.github/workflows/deploy.yml",
    "content/papers/../../src/lib/auth.ts",
    "/etc/passwd",
    "content%2f..%2fsrc%2fa.ts",
  ])("경로 순회는 400 이고 커밋하지 않는다: %s", async (path) => {
    const response = await POST(request({ path, content: CONTENT }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("frontmatter 가 깨졌으면 커밋하지 않고 400 + 필드별 사유를 준다", async () => {
    const response = await POST(
      request({ path: VALID_PATH, content: CONTENT.replace("title: 테스트 글", "title: ''") }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      issues: [{ field: "title" }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("본문이 JSON 이 아니면 400 이다", async () => {
    const broken = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Request;

    expect((await POST(broken)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("발행 설정이 없으면 503 이고 커밋을 시도하지 않는다", async () => {
    vi.stubEnv("GITHUB_CONTENT_TOKEN", "");

    const response = await POST(request({ path: VALID_PATH, content: CONTENT }));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    // 변수 이름 안내는 관리자 홈이 한다 — 라우트는 값도 이름도 만지지 않는다.
    expect(body.message).toContain("설정되지 않았다");
    expect(body.message).not.toContain(TOKEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/publish — 커밋", () => {
  it("신규 글은 sha 없이 feat(content) 메시지로 커밋하고 커밋 URL 을 돌려준다", async () => {
    commitOk();

    const response = await POST(request({ path: VALID_PATH, content: CONTENT }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      path: VALID_PATH,
      sha: "new-sha",
      commitUrl: "https://github.com/owner/repo/commit/abc",
      message: "feat(content): papers/moe-routing",
    });
    expect(sentBody()).toMatchObject({
      message: "feat(content): papers/moe-routing",
      branch: "main",
    });
    expect(sentBody().sha).toBeUndefined();
  });

  it("sha 가 있으면 fix(content) 메시지로 덮어쓴다", async () => {
    commitOk();

    await POST(request({ path: VALID_PATH, content: CONTENT, sha: "old-sha" }));

    expect(sentBody()).toMatchObject({
      message: "fix(content): papers/moe-routing",
      sha: "old-sha",
    });
  });

  /**
   * 실측(실제 레포): Contents API 는 낡은 sha 로 덮어쓰면 409, 이미 있는 파일에 sha 없이 쓰면 422 다.
   * 사용자가 해야 할 일이 다르므로 문장도 달라야 한다.
   */
  it("409 (낡은 sha) 는 '그 사이 수정되었다' 로 번역한다", async () => {
    respond(409, { message: "does not match a3fbafd" });

    const response = await POST(
      request({ path: VALID_PATH, content: CONTENT, sha: "stale" }),
    );
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(text).toContain("그 사이 다른 곳에서 이 글이 수정되었다");
    // 원인을 숨기지 않는다 — GitHub 원문도 함께 남긴다.
    expect(text).toContain("does not match");
    expect(text).not.toContain(TOKEN);
  });

  it("422 (신규인데 파일이 이미 있음) 는 경로가 겹쳤다고 알려 준다", async () => {
    respond(422, { message: '"sha" wasn\'t supplied.' });

    const response = await POST(request({ path: VALID_PATH, content: CONTENT }));
    const text = await response.text();

    expect(response.status).toBe(422);
    expect(text).toContain("그 경로에 이미 글이 있다");
    expect(text).not.toContain(TOKEN);
  });

  it("그 밖의 실패는 GitHub 의 상태코드와 메시지를 그대로 전달한다", async () => {
    respond(403, { message: "Resource not accessible" });

    const response = await POST(request({ path: VALID_PATH, content: CONTENT }));
    const text = await response.text();

    expect(response.status).toBe(403);
    expect(text).toContain("Resource not accessible");
    expect(text).not.toContain(TOKEN);
  });
});

describe("DELETE /api/publish", () => {
  it("chore(content): remove 메시지로 삭제한다", async () => {
    respond(200, { commit: { html_url: "https://github.com/owner/repo/commit/def" } });

    const response = await DELETE(request({ path: VALID_PATH, sha: "abc" }));

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    expect(sentBody()).toMatchObject({
      message: "chore(content): remove papers/moe-routing",
      sha: "abc",
      branch: "main",
    });
  });

  it("sha 가 없으면 400 이고 아무것도 지우지 않는다", async () => {
    const response = await DELETE(request({ path: VALID_PATH }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
