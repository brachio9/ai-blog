import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * DB 를 타는 함수만 바꿔 끼운다 — id 검증(isValidPostId)과 추적 on/off 판정은 실물을 쓴다.
 * 검증을 모킹하면 라우트가 정말 거르는지가 테스트에서 사라진다.
 */
vi.mock("@/services/turso", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/turso")>()),
  getView: vi.fn(),
  getViews: vi.fn(),
  incrementView: vi.fn(),
}));

const { getViews } = await import("@/services/turso");
const { GET } = await import("./route");

const batch = vi.mocked(getViews);

function get(query: string): Request {
  return new Request(`http://localhost/api/views?${query}`);
}

/** vitest 는 `.env.local` 을 process.env 로 올린다 — "있음"·"없음" 둘 다 명시적으로 stub 한다. */
function enableTracking(): void {
  vi.stubEnv("TURSO_DATABASE_URL", "libsql://test.turso.io");
  vi.stubEnv("TURSO_AUTH_TOKEN", "token");
}

beforeEach(() => {
  enableTracking();
  batch.mockReset();
  batch.mockImplementation(async (ids) =>
    Object.fromEntries(ids.map((id, index) => [id, index + 1])),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/views?ids=", () => {
  it("여러 건을 한 번에 돌려준다", async () => {
    const response = await GET(get("ids=papers/moe-routing,notes/quantization"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      views: { "papers/moe-routing": 1, "notes/quantization": 2 },
    });
    // 새 쿼리를 짜지 않고 services/turso 의 배치 함수를 그대로 쓴다.
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch).toHaveBeenCalledWith([
      "papers/moe-routing",
      "notes/quantization",
    ]);
  });

  it("잘못된 id 가 섞여도 400 으로 전체를 버리지 않고 나머지를 돌려준다", async () => {
    const response = await GET(
      get("ids=papers/ok,없는카테고리/x,깨진값,papers/Bad_Slug,notes/ok"),
    );

    expect(response.status).toBe(200);
    expect(batch).toHaveBeenCalledWith(["papers/ok", "notes/ok"]);
    expect(await response.json()).toEqual({
      views: { "papers/ok": 1, "notes/ok": 2 },
    });
  });

  it("같은 id 를 여러 번 보내도 한 번만 조회한다", async () => {
    await GET(get("ids=papers/a,papers/a,papers/b"));

    expect(batch).toHaveBeenCalledWith(["papers/a", "papers/b"]);
  });

  it("개수 상한을 넘으면 앞의 100개만 조회한다", async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `papers/p-${index}`);

    await GET(get(`ids=${ids.join(",")}`));

    const requested = batch.mock.calls[0][0];
    expect(requested).toHaveLength(100);
    expect(requested).toEqual(ids.slice(0, 100));
  });

  it("추적이 꺼져 있으면 200 + 빈 객체이고 DB 를 건드리지 않는다", async () => {
    vi.stubEnv("TURSO_DATABASE_URL", "");
    vi.stubEnv("TURSO_AUTH_TOKEN", "");

    const response = await GET(get("ids=papers/moe-routing"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ views: {} });
    expect(batch).not.toHaveBeenCalled();
  });

  it("유효한 id 가 하나도 없으면 빈 객체를 준다 (열이 통째로 사라지면 안 된다)", async () => {
    const response = await GET(get("ids=깨진값,,//"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ views: {} });
    expect(batch).toHaveBeenCalledWith([]);
  });

  it("기존 단건 조회(?id=)는 그대로다", async () => {
    const { getView } = await import("@/services/turso");
    vi.mocked(getView).mockResolvedValue(7);

    const response = await GET(get("id=papers/moe-routing"));

    expect(await response.json()).toEqual({ count: 7 });
    expect(batch).not.toHaveBeenCalled();
  });
});
