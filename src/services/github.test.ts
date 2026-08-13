import { Buffer } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GitHubApiError,
  commitFile,
  deleteFile,
  isPublishConfigured,
  listPosts,
  readFile,
} from "./github";

/**
 * 실제 GitHub 을 부르지 않는다 — 네트워크 없이 돌아야 하고 남의 레포에 쓰레기를 남기면 안 된다.
 * fetch 를 통째로 갈아끼우고 요청 body 와 던지는 에러만 본다.
 *
 * vitest 는 `.env.local` 을 process.env 로 올린다 — "없음" 도 명시적으로 stub 해야 한다.
 */
const REPO = "owner/repo";
const BRANCH = "main";
/** 이 문자열이 에러 메시지에 새어 나오면 안 된다 (CLAUDE.md CRITICAL). */
const TOKEN = "github_pat_11ABCDEFG_verysecretvalue";

const ENV_NAMES = [
  "GITHUB_CONTENT_REPO",
  "GITHUB_CONTENT_BRANCH",
  "GITHUB_CONTENT_TOKEN",
];

const fetchMock = vi.fn();

function configure(): void {
  vi.stubEnv("GITHUB_CONTENT_REPO", REPO);
  vi.stubEnv("GITHUB_CONTENT_BRANCH", BRANCH);
  vi.stubEnv("GITHUB_CONTENT_TOKEN", TOKEN);
}

function respond(status: number, body: unknown): void {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

/** GitHub 은 파일 본문을 줄바꿈으로 접은 base64 로 준다. */
function fileResponse(text: string, sha = "file-sha") {
  return {
    sha,
    encoding: "base64",
    content: Buffer.from(text, "utf8")
      .toString("base64")
      .replace(/(.{60})/g, "$1\n"),
  };
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: String(url), init: init as RequestInit };
}

function sentBody(): Record<string, unknown> {
  return JSON.parse(String(lastCall().init.body)) as Record<string, unknown>;
}

beforeEach(() => {
  configure();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isPublishConfigured", () => {
  it("세 환경변수가 전부 있으면 true 다", () => {
    expect(isPublishConfigured()).toBe(true);
  });

  it("하나라도 빠지면 false 다", () => {
    for (const name of ENV_NAMES) {
      configure();
      vi.stubEnv(name, "");

      expect(isPublishConfigured()).toBe(false);
    }
  });

  it("공백만 있는 값도 없는 것으로 본다", () => {
    vi.stubEnv("GITHUB_CONTENT_TOKEN", "   ");

    expect(isPublishConfigured()).toBe(false);
  });
});

describe("설정이 없을 때", () => {
  it("쓰기 함수가 조용히 넘어가지 않고 던진다", async () => {
    vi.stubEnv("GITHUB_CONTENT_TOKEN", "");

    await expect(
      commitFile({
        path: "content/notes/a.mdx",
        content: "본문",
        message: "m",
      }),
    ).rejects.toThrow(/설정되지 않았다/);
    await expect(
      deleteFile({ path: "content/notes/a.mdx", sha: "s", message: "m" }),
    ).rejects.toThrow(/설정되지 않았다/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("readFile", () => {
  it("404 면 던지지 않고 null 을 준다 — 신규 파일이라는 신호다", async () => {
    respond(404, { message: "Not Found" });

    await expect(readFile("content/notes/2026-08-05-new.mdx")).resolves.toBe(
      null,
    );
  });

  it("한글 본문이 base64 왕복 뒤에도 원문 그대로다", async () => {
    const original = [
      "---",
      'title: "한글 제목 — 손실 없이 왕복"',
      "---",
      "",
      "본문에 한글·기호·이모지가 섞여도 깨지지 않아야 한다: ✓ ≥ 90%",
    ].join("\n");
    respond(200, fileResponse(original, "abc123"));

    const file = await readFile("content/notes/2026-08-05-utf8.mdx");

    expect(file).toEqual({
      path: "content/notes/2026-08-05-utf8.mdx",
      sha: "abc123",
      content: original,
    });
  });

  it("브랜치를 ref 로 붙이고 캐시를 쓰지 않는다", async () => {
    respond(200, fileResponse("본문"));

    await readFile("content/notes/2026-08-05-a.mdx");

    const { url, init } = lastCall();
    expect(url).toBe(
      `https://api.github.com/repos/${REPO}/contents/content/notes/2026-08-05-a.mdx?ref=${BRANCH}`,
    );
    expect(init.cache).toBe("no-store");
  });
});

describe("commitFile", () => {
  const CONTENT = "# 한글 본문\n\n요약도 한글이다.";

  it("한글 본문을 utf8 base64 로 실어 보낸다", async () => {
    respond(201, { content: { sha: "new" }, commit: { html_url: "u" } });

    await commitFile({
      path: "content/notes/2026-08-05-a.mdx",
      content: CONTENT,
      message: "feat: 새 글",
    });

    const body = sentBody();
    expect(Buffer.from(String(body.content), "base64").toString("utf8")).toBe(
      CONTENT,
    );
    expect(body.branch).toBe(BRANCH);
    expect(body.message).toBe("feat: 새 글");
  });

  it("sha 를 주면 body 에 싣고, 안 주면 뺀다", async () => {
    respond(200, { content: { sha: "s2" }, commit: { html_url: "u2" } });
    await commitFile({
      path: "content/notes/2026-08-05-a.mdx",
      content: CONTENT,
      message: "fix: 수정",
      sha: "old-sha",
    });
    expect(sentBody().sha).toBe("old-sha");

    respond(201, { content: { sha: "s1" }, commit: { html_url: "u1" } });
    await commitFile({
      path: "content/notes/2026-08-05-b.mdx",
      content: CONTENT,
      message: "feat: 새 글",
    });
    expect("sha" in sentBody()).toBe(false);
  });

  it("커밋 결과의 sha 와 커밋 URL 을 준다", async () => {
    respond(201, {
      content: { sha: "content-sha" },
      commit: { html_url: "https://github.com/owner/repo/commit/deadbeef" },
    });

    await expect(
      commitFile({
        path: "content/notes/2026-08-05-a.mdx",
        content: CONTENT,
        message: "feat: 새 글",
      }),
    ).resolves.toEqual({
      sha: "content-sha",
      commitUrl: "https://github.com/owner/repo/commit/deadbeef",
    });
  });
});

describe("실패 응답", () => {
  /** 커밋을 한 번 시도하고 던져진 GitHubApiError 를 꺼낸다. */
  async function commitFailure(status: number, body: unknown) {
    respond(status, body);
    const thrown: unknown = await commitFile({
      path: "content/notes/2026-08-05-a.mdx",
      content: "본문",
      message: "feat: 새 글",
    }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(thrown).toBeInstanceOf(GitHubApiError);
    return thrown as GitHubApiError;
  }

  it("401 은 상태코드를 담아 던지고 토큰은 담지 않는다", async () => {
    const error = await commitFailure(401, { message: "Bad credentials" });

    expect(error.status).toBe(401);
    expect(error.message).toContain("401");
    expect(error.message).toContain("Bad credentials");
    expect(error.message).not.toContain(TOKEN);
  });

  it("422 는 sha 충돌로, 409 는 브랜치 충돌로 구분된다", async () => {
    const conflict = await commitFailure(422, {
      message: '"sha" wasn\'t supplied.',
    });
    expect(conflict.status).toBe(422);
    expect(conflict.message).toContain("sha");
    expect(conflict.message).not.toContain(TOKEN);

    const branchConflict = await commitFailure(409, {
      message: "is at aaa but expected bbb",
    });
    expect(branchConflict.status).toBe(409);
    expect(branchConflict.message).toContain("브랜치 충돌");
  });
});

describe("deleteFile", () => {
  it("sha 와 branch 를 body 에 실어 DELETE 한다", async () => {
    respond(200, { commit: { html_url: "u" } });

    await deleteFile({
      path: "content/notes/2026-08-05-a.mdx",
      sha: "target-sha",
      message: "chore: 삭제",
    });

    const { init } = lastCall();
    expect(init.method).toBe("DELETE");
    expect(sentBody()).toEqual({
      message: "chore: 삭제",
      sha: "target-sha",
      branch: BRANCH,
    });
  });
});

describe("listPosts", () => {
  const VALID = [
    "---",
    'title: "정상 글"',
    "category: notes",
    'summary: "요약"',
    'publishedAt: "2026-08-05T10:00:00+0900"',
    "---",
    "",
    "본문",
  ].join("\n");

  /** category·summary·publishedAt 이 없다 — parseFrontmatter 가 던진다. */
  const BROKEN = ["---", 'title: "깨진 글"', "---", "", "본문"].join("\n");

  function routeToFixtures(): void {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.includes("/contents/content/notes?")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              name: "2026-08-05-good.mdx",
              path: "content/notes/2026-08-05-good.mdx",
              sha: "sha-good",
              type: "file",
            },
            {
              name: "2026-08-04-broken.mdx",
              path: "content/notes/2026-08-04-broken.mdx",
              sha: "sha-broken",
              type: "file",
            },
            {
              name: ".gitkeep",
              path: "content/notes/.gitkeep",
              sha: "sha-k",
              type: "file",
            },
          ],
        };
      }
      if (url.includes("2026-08-05-good.mdx")) {
        return {
          ok: true,
          status: 200,
          json: async () => fileResponse(VALID, "sha-good"),
        };
      }
      if (url.includes("2026-08-04-broken.mdx")) {
        return {
          ok: true,
          status: 200,
          json: async () => fileResponse(BROKEN, "sha-broken"),
        };
      }
      // 아직 글이 없는 카테고리 디렉토리
      return {
        ok: false,
        status: 404,
        json: async () => ({ message: "Not Found" }),
      };
    });
  }

  it("frontmatter 가 깨진 글이 섞여도 나머지를 돌려준다", async () => {
    routeToFixtures();

    const posts = await listPosts();

    expect(posts.map((post) => post.path)).toEqual([
      "content/notes/2026-08-05-good.mdx",
      "content/notes/2026-08-04-broken.mdx",
    ]);

    const [good, broken] = posts;
    expect(good.frontmatter?.title).toBe("정상 글");
    expect(good.category).toBe("notes");
    expect(good.slug).toBe("good");
    expect(good.sha).toBe("sha-good");
    expect(good.error).toBeUndefined();

    expect(broken.frontmatter).toBe(null);
    expect(broken.slug).toBe("broken");
    expect(broken.error).toContain("frontmatter 검증 실패");
  });

  it("글이 하나도 없으면 빈 목록이다", async () => {
    respond(404, { message: "Not Found" });

    await expect(listPosts()).resolves.toEqual([]);
  });
});
