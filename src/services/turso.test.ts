import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getView,
  getViews,
  incrementView,
  isValidPostId,
  isViewTrackingEnabled,
  mergeViewRows,
} from "./turso";

/**
 * 실제 Turso 에 붙지 않는 단위 테스트 — CI·오프라인에서도 돌아야 한다.
 * 그래서 여기서는 (1) 순수 함수와 (2) 환경변수가 없어 아예 연결하지 않는 경로만 다룬다.
 * 자격증명이 있는 경로는 네트워크가 필요하므로 단위 테스트로 덮지 않는다.
 *
 * vitest 는 `.env.local` 을 process.env 로 올린다 — "없음" 도 반드시 명시적으로 stub 해야 한다.
 */
function disableTracking(): void {
  vi.stubEnv("TURSO_DATABASE_URL", "");
  vi.stubEnv("TURSO_AUTH_TOKEN", "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isValidPostId", () => {
  it("{category}/{slug} 형식이고 카테고리가 등록돼 있으면 통과한다", () => {
    expect(isValidPostId("news/open-weight-benchmark-roundup")).toBe(true);
    expect(isValidPostId("papers/moe-routing-pipeline")).toBe(true);
    expect(isValidPostId("notes/quantization-notes")).toBe(true);
    expect(isValidPostId("notes/gpt5")).toBe(true);
  });

  it("등록되지 않은 카테고리는 거절한다", () => {
    expect(isValidPostId("does-not-exist/some-post")).toBe(false);
    expect(isValidPostId("admin/some-post")).toBe(false);
  });

  it("형식이 어긋나면 거절한다", () => {
    expect(isValidPostId("")).toBe(false);
    expect(isValidPostId("news")).toBe(false);
    expect(isValidPostId("news/")).toBe(false);
    expect(isValidPostId("/some-post")).toBe(false);
    expect(isValidPostId("news/nested/post")).toBe(false);
    expect(isValidPostId("news/Upper-Case")).toBe(false);
    expect(isValidPostId("news/-leading")).toBe(false);
    expect(isValidPostId("news/trailing-")).toBe(false);
    expect(isValidPostId("news/double--dash")).toBe(false);
    expect(isValidPostId("news/공백 없음")).toBe(false);
    expect(isValidPostId("news/../../etc/passwd")).toBe(false);
  });

  it("지나치게 긴 slug 는 거절한다", () => {
    expect(isValidPostId(`notes/${"a".repeat(100)}`)).toBe(true);
    expect(isValidPostId(`notes/${"a".repeat(101)}`)).toBe(false);
  });
});

describe("mergeViewRows", () => {
  it("행이 돌아오지 않은 글을 0 으로 채운다", () => {
    expect(
      mergeViewRows(
        ["notes/has-rows", "notes/never-viewed"],
        [{ post_id: "notes/has-rows", count: 42 }],
      ),
    ).toEqual({ "notes/has-rows": 42, "notes/never-viewed": 0 });
  });

  it("행이 하나도 없으면 전부 0 이다", () => {
    expect(mergeViewRows(["notes/a", "notes/b"], [])).toEqual({
      "notes/a": 0,
      "notes/b": 0,
    });
  });

  it("빈 목록은 빈 결과다", () => {
    expect(mergeViewRows([], [])).toEqual({});
  });

  it("number 가 아닌 count 도 숫자로 읽는다", () => {
    expect(
      mergeViewRows(
        ["notes/a", "notes/b", "notes/c"],
        [
          { post_id: "notes/a", count: BigInt(7) },
          { post_id: "notes/b", count: "13" },
          { post_id: "notes/c", count: null },
        ],
      ),
    ).toEqual({ "notes/a": 7, "notes/b": 13, "notes/c": 0 });
  });
});

describe("환경변수가 없을 때", () => {
  it("isViewTrackingEnabled() 가 false 다", () => {
    disableTracking();

    expect(isViewTrackingEnabled()).toBe(false);
  });

  it("한쪽 값만 있어도 비활성이다", () => {
    disableTracking();
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://test.turso.io");

    expect(isViewTrackingEnabled()).toBe(false);
  });

  it("둘 다 있으면 활성이다", () => {
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://test.turso.io");
    vi.stubEnv("TURSO_AUTH_TOKEN", "test-token");

    expect(isViewTrackingEnabled()).toBe(true);
  });

  it("던지지 않고 0 을 준다 — 조회수가 글 렌더를 막으면 안 된다", async () => {
    disableTracking();

    await expect(incrementView("notes/some-post")).resolves.toBe(0);
    await expect(getView("notes/some-post")).resolves.toBe(0);
    await expect(getViews(["notes/a", "notes/b"])).resolves.toEqual({
      "notes/a": 0,
      "notes/b": 0,
    });
  });
});
