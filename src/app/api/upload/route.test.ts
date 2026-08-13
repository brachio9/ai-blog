import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_UPLOAD_BYTES } from "./upload";

/** publish 라우트와 같은 이유로 @/lib/auth 를 모킹한다 (next-auth 는 vitest 에서 뜨지 않는다). */
vi.mock("@/lib/auth", () => ({ getAdminLogin: vi.fn() }));

const { getAdminLogin } = await import("@/lib/auth");
const { POST } = await import("./route");

const adminLogin = vi.mocked(getAdminLogin);

const TOKEN = "github_pat_11ABCDEFG_verysecretvalue";

const fetchMock = vi.fn();

function upload(file: File | null): Request {
  const form = new FormData();
  if (file) {
    form.set("file", file);
  }
  return { formData: async () => form } as Request;
}

function png(name: string, bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
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
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      content: { sha: "img-sha" },
      commit: { html_url: "https://github.com/owner/repo/commit/img" },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  adminLogin.mockResolvedValue("owner");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/upload", () => {
  it("세션이 없으면 404 이고 GitHub 에 아무것도 나가지 않는다", async () => {
    adminLogin.mockResolvedValue(null);

    const response = await POST(upload(png("a.png")));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("file 필드가 없으면 400 이다", async () => {
    const response = await POST(upload(null));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("허용하지 않는 확장자는 커밋하지 않는다", async () => {
    const response = await POST(upload(png("payload.html")));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("4MB 를 넘으면 커밋하지 않는다", async () => {
    const response = await POST(upload(png("big.png", MAX_UPLOAD_BYTES + 1)));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("public/uploads 아래에 base64 로 커밋하고 본문에 넣을 URL 을 돌려준다 (ADR-005)", async () => {
    const response = await POST(upload(png("../evil name.PNG")));
    const body = (await response.json()) as {
      ok: boolean;
      url: string;
      path: string;
      commitUrl: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    // 파일명은 서버가 정한다 — 올라온 이름의 순회 조각은 남지 않는다.
    expect(body.path).toMatch(
      /^public\/uploads\/\d{4}\/\d{2}\/\d{2}-\d{6}-evil-name\.png$/,
    );
    expect(body.url).toBe(body.path.replace("public", ""));
    expect(body.commitUrl).toBe("https://github.com/owner/repo/commit/img");

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/contents/${body.path}`);
    expect(sentBody()).toMatchObject({
      message: `chore(uploads): add ${body.url}`,
      content: "AAAAAAAAAAA=",
      branch: "main",
    });
  });

  it("GitHub 실패는 상태코드와 메시지를 그대로 전달하되 토큰은 넣지 않는다", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Resource not accessible" }),
    });

    const response = await POST(upload(png("a.png")));
    const text = await response.text();

    expect(response.status).toBe(403);
    expect(text).toContain("Resource not accessible");
    expect(text).not.toContain(TOKEN);
  });
});
