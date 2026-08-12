import { describe, expect, it } from "vitest";

import { formatDate, formatDateShort } from "./format";

describe("formatDate", () => {
  it("KST 새벽 시각을 UTC 로 밀지 않는다 (UTC 로는 전날)", () => {
    // 2026-08-09T00:30+0900 == 2026-08-08T15:30Z
    expect(formatDate("2026-08-09T00:30:00+0900")).toBe("2026년 8월 9일");
  });

  it("UTC 표기 입력도 KST 로 옮겨 읽는다", () => {
    // 2026-08-08T16:00Z == 2026-08-09T01:00+0900
    expect(formatDate("2026-08-08T16:00:00Z")).toBe("2026년 8월 9일");
  });

  it("월·일의 0 을 떼고 쓴다", () => {
    expect(formatDate("2026-01-05T09:00:00+0900")).toBe("2026년 1월 5일");
  });
});

describe("formatDateShort", () => {
  it("KST 기준으로 0 을 채운 점 구분 표기를 쓴다", () => {
    expect(formatDateShort("2026-08-09T00:30:00+0900")).toBe("2026.08.09");
    expect(formatDateShort("2026-08-08T16:00:00Z")).toBe("2026.08.09");
    expect(formatDateShort("2026-01-05T09:00:00+0900")).toBe("2026.01.05");
  });
});
